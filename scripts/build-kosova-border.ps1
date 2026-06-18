# ============================================================================
#  Nxjerr kufirin kombetar te Kosoves nga UNIONI i komunave (dissolve).
#  Logjika topologjike: cdo skaj (segment) qe i perket VETEM nje komune eshte
#  ne kufirin e jashtem; skajet e perbashketa mes dy komunave jane te brendshme
#  (numerohen 2 here -> anulohen). Keshtu kufiri perputhet SAKTE me skajet e
#  jashtme te komunave qe jane pergjate kufirit. Pastaj i qep skajet ne vija.
#  Del -> data/kosova.geojson (MultiLineString, WGS84). ASCII-only.
# ============================================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$komPath = Join-Path $root "data/komunat.geojson"
$outPath = Join-Path $root "data/kosova.geojson"
$inv = [System.Globalization.CultureInfo]::InvariantCulture

Write-Host "1/4 Lexim i komunave ..."
$kom = Get-Content $komPath -Raw -Encoding UTF8 | ConvertFrom-Json
function PKey($lon,$lat){ [string]::Format($inv,'{0:F6},{1:F6}',[double]$lon,[double]$lat) }

# Mblidh te gjitha skajet (nga te gjitha unazat: te jashtme + vrima/enklava)
Write-Host "2/4 Numerim i skajeve ..."
$edgeCount = @{}     # canonicalKey -> numri i shfaqjeve
$edgePts   = @{}     # canonicalKey -> @(lon1,lat1,lon2,lat2)  (koordinatat reale)
$ptCoord   = @{}     # pointKey -> @(lon,lat)
foreach($f in $kom.features){
  foreach($poly in $f.geometry.coordinates){       # MultiPolygon -> poligone
    foreach($ring in $poly){                        # poligon -> unaza (e jashtme + vrima)
      for($i=0; $i -lt $ring.Count-1; $i++){
        $aLon=[double]$ring[$i][0];   $aLat=[double]$ring[$i][1]
        $bLon=[double]$ring[$i+1][0]; $bLat=[double]$ring[$i+1][1]
        $ka=PKey $aLon $aLat; $kb=PKey $bLon $bLat
        if($ka -eq $kb){ continue }                 # skaj zero
        if(-not $ptCoord.ContainsKey($ka)){ $ptCoord[$ka]=@($aLon,$aLat) }
        if(-not $ptCoord.ContainsKey($kb)){ $ptCoord[$kb]=@($bLon,$bLat) }
        $ek = if($ka -lt $kb){ "$ka|$kb" } else { "$kb|$ka" }   # celes i pa-drejtuar
        $edgeCount[$ek] = 1 + [int]$edgeCount[$ek]
        if(-not $edgePts.ContainsKey($ek)){ $edgePts[$ek]=@($ka,$kb) }
      }
    }
  }
}
$boundary = @($edgeCount.Keys | Where-Object { $edgeCount[$_] -eq 1 })
Write-Host ("   skaje gjithsej={0}  skaje kufitare(1x)={1}" -f $edgeCount.Count,$boundary.Count)

# Ndertimi i adjacences mes pikave permes skajeve kufitare
Write-Host "3/4 Qepja e skajeve ne vija ..."
$adj = @{}            # pointKey -> ArrayList of edgeKey
foreach($ek in $boundary){
  $pa=$edgePts[$ek][0]; $pb=$edgePts[$ek][1]
  if(-not $adj.ContainsKey($pa)){ $adj[$pa]=New-Object System.Collections.ArrayList }
  if(-not $adj.ContainsKey($pb)){ $adj[$pb]=New-Object System.Collections.ArrayList }
  [void]$adj[$pa].Add($ek); [void]$adj[$pb].Add($ek)
}
$used = @{}
$chains = New-Object System.Collections.ArrayList
function OtherEnd($ek,$p){ if($edgePts[$ek][0] -eq $p){ return $edgePts[$ek][1] } else { return $edgePts[$ek][0] } }
foreach($startEk in $boundary){
  if($used.ContainsKey($startEk)){ continue }
  $used[$startEk]=$true
  $p0=$edgePts[$startEk][0]; $p1=$edgePts[$startEk][1]
  $chain = New-Object System.Collections.ArrayList
  [void]$chain.Add($p0); [void]$chain.Add($p1)
  # zgjate perpara nga p1
  $cur=$p1
  while($true){
    $nextEk=$null
    foreach($ek in $adj[$cur]){ if(-not $used.ContainsKey($ek)){ $nextEk=$ek; break } }
    if($null -eq $nextEk){ break }
    $used[$nextEk]=$true; $cur=OtherEnd $nextEk $cur; [void]$chain.Add($cur)
  }
  # zgjate prapa nga p0
  $cur=$p0
  while($true){
    $prevEk=$null
    foreach($ek in $adj[$cur]){ if(-not $used.ContainsKey($ek)){ $prevEk=$ek; break } }
    if($null -eq $prevEk){ break }
    $used[$prevEk]=$true; $cur=OtherEnd $prevEk $cur; [void]$chain.Insert(0,$cur)
  }
  [void]$chains.Add($chain)
}
$closed = ($chains | Where-Object { $_[0] -eq $_[$_.Count-1] }).Count
Write-Host ("   vija(chains)={0}  prej tyre te mbyllura={1}" -f $chains.Count,$closed)
# Hiq sliver-at e vegjel (mosperputhje minimale mes komunave) -> mbaj konturen reale
$chains = @($chains | Where-Object { $_.Count -ge 20 })
Write-Host ("   pas pastrimit te sliver-ave: {0} vija" -f $chains.Count)

# Shkrim MultiLineString
Write-Host "4/4 Shkrim data/kosova.geojson ..."
$sb=[System.Text.StringBuilder]::new()
[void]$sb.Append('{"type":"FeatureCollection","name":"kosova","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},')
[void]$sb.Append('"features":[{"type":"Feature","properties":{"name":"Kosova"},"geometry":{"type":"MultiLineString","coordinates":[')
$firstChain=$true
foreach($chain in $chains){
  if(-not $firstChain){ [void]$sb.Append(',') }; $firstChain=$false
  [void]$sb.Append('[')
  $firstPt=$true
  foreach($pk in $chain){
    if(-not $firstPt){ [void]$sb.Append(',') }; $firstPt=$false
    $c=$ptCoord[$pk]
    [void]$sb.Append([string]::Format($inv,'[{0},{1}]',$c[0],$c[1]))
  }
  [void]$sb.Append(']')
}
[void]$sb.Append(']}}]}')
[System.IO.File]::WriteAllText($outPath,$sb.ToString(),[System.Text.UTF8Encoding]::new($false))
Write-Host ("PERFUNDOI -> {0} ({1} bytes)" -f $outPath,((Get-Item $outPath).Length))
