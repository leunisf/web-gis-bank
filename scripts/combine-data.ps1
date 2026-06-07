# ============================================================================
#  Kombinimi i te dhenave (Banka & ATM, Kosove)
#  Bashkon:
#    (A) te dhenat ekzistuese  -> data/bankat.geojson + data/atm.geojson
#    (B) dataset-in e ri HOTOSM -> Shapefiles/Bankk/...financial_services_points
#  Hapat:
#    - lexon HOTOSM shp+dbf (pa biblioteka te jashtme)
#    - filtron amenity in {bank, atm}  (post_office/money_transfer/bureau s'jane tema)
#    - normalizon marken (name -> operator -> network)
#    - cakton komunen me point-in-polygon (nga data/komunat.geojson, tashme 4326)
#    - bashkon me te vjetrat dhe heq dublikatat sipas osm_id
#    - shkruan data/bankat.geojson + data/atm.geojson (ben backup te te vjetrave)
# ============================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root "data"
$hot  = Join-Path $root "Shapefiles/Bankk/hotosm_xkx_financial_services_points_shp/hotosm_xkx_financial_services_points_shp"

# ---------- Lexues binar ----------
function Read-DBFTable($path){
  $b=[System.IO.File]::ReadAllBytes($path)
  $numRec=[BitConverter]::ToUInt32($b,4)
  $headerSize=[BitConverter]::ToUInt16($b,8)
  $recSize=[BitConverter]::ToUInt16($b,10)
  $fields=@();$pos=32
  while($b[$pos] -ne 0x0D){
    $fields+=[pscustomobject]@{name=[System.Text.Encoding]::ASCII.GetString($b,$pos,11).TrimEnd([char]0);len=$b[$pos+16]}
    $pos+=32
  }
  $enc=[System.Text.Encoding]::UTF8
  $rows=New-Object System.Collections.ArrayList
  for($r=0;$r -lt $numRec;$r++){
    $off=$headerSize+$r*$recSize+1; $row=@{}
    foreach($f in $fields){ $row[$f.name]=$enc.GetString($b,$off,$f.len).Trim(); $off+=$f.len }
    [void]$rows.Add([pscustomobject]$row)
  }
  return $rows
}
function Read-BE-Int32($b,$off){ $t=$b[$off..($off+3)];[array]::Reverse($t);[BitConverter]::ToInt32($t,0) }
function Read-SHPPoints($path){
  $b=[System.IO.File]::ReadAllBytes($path)
  $fileLen=(Read-BE-Int32 $b 24)*2; $pos=100
  $pts=New-Object System.Collections.ArrayList
  while($pos -lt $fileLen){
    $contentLen=(Read-BE-Int32 $b ($pos+4))*2; $c=$pos+8
    $st=[BitConverter]::ToInt32($b,$c)
    if($st -eq 1){ $x=[BitConverter]::ToDouble($b,$c+4);$y=[BitConverter]::ToDouble($b,$c+12);[void]$pts.Add([pscustomobject]@{x=$x;y=$y}) }
    else { [void]$pts.Add($null) }
    $pos=$c+$contentLen
  }
  return $pts
}

# ---------- Normalizim marke ----------
function Get-Brand($text){
  if([string]::IsNullOrWhiteSpace($text)){ return 'E panjohur' }
  $n=$text.ToLower()
  if($n -match 'raif'){ return 'Raiffeisen Bank' }
  if($n -match 'procredit|pro credit'){ return 'ProCredit Bank' }
  if($n -match '\bteb\b|t\.e\.b'){ return 'TEB' }
  if($n -match 'nlb'){ return 'NLB Banka' }
  if($n -match 'bpb|per biznes|për biznes'){ return 'Banka per Biznes (BPB)' }
  if($n -match 'ekonomik'){ return 'Banka Ekonomike' }
  if($n -match 'kombetare|kombëtare|\bbkt\b'){ return 'BKT' }
  if($n -match 'credins'){ return 'Credins Bank' }
  if($n -match 'ziraat'){ return 'Ziraat Bank' }
  if($n -match '\bafk\b'){ return 'AFK' }
  if($n -match '\bkep\b'){ return 'KEP Trust' }
  if($n -match 'iute'){ return 'IuteCredit' }
  if($n -match 'monego'){ return 'Monego' }
  return $text
}

# ---------- Point-in-polygon ----------
function Point-In-Ring($lon,$lat,$ring){
  $inside=$false;$n=$ring.Count;$j=$n-1
  for($i=0;$i -lt $n;$i++){
    $xi=$ring[$i][0];$yi=$ring[$i][1];$xj=$ring[$j][0];$yj=$ring[$j][1]
    if((($yi -gt $lat) -ne ($yj -gt $lat)) -and ($lon -lt ($xj-$xi)*($lat-$yi)/($yj-$yi)+$xi)){ $inside=-not $inside }
    $j=$i
  }
  return $inside
}

# ---------- 1) Indeks komunash nga data/komunat.geojson (4326) ----------
Write-Host "1/5 Komunat (point-in-polygon index) ..."
$komJson = Get-Content (Join-Path $out "komunat.geojson") -Raw -Encoding UTF8 | ConvertFrom-Json
$komIndex=@()
foreach($f in $komJson.features){
  $rings=New-Object System.Collections.ArrayList
  foreach($poly in $f.geometry.coordinates){
    foreach($ring in $poly){ [void]$rings.Add($ring) }   # cdo ring = [[lon,lat],...]
  }
  $komIndex+=[pscustomobject]@{ name=$f.properties.name; rings=$rings }
}
function Which-Komuna($lon,$lat){
  foreach($k in $script:komIndex){ foreach($r in $k.rings){ if(Point-In-Ring $lon $lat $r){ return $k.name } } }
  return ''
}
Write-Host "   -> $($komIndex.Count) komuna"

# ---------- 2) HOTOSM: lexim + filtrim bank/atm ----------
Write-Host "2/5 HOTOSM dataset (bank + atm) ..."
$hDbf=Read-DBFTable ($hot+".dbf")
$hPts=Read-SHPPoints ($hot+".shp")
$merged=@{}   # key = osm_id  -> feature
$catCount=@{}
for($i=0;$i -lt $hPts.Count;$i++){
  $g=$hPts[$i]; if($null -eq $g){ continue }
  $row=$hDbf[$i]; $am=$row.amenity
  $catCount[$am]=1+[int]$catCount[$am]
  if($am -ne 'bank' -and $am -ne 'atm'){ continue }
  $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
  $nm=$row.name; if([string]::IsNullOrWhiteSpace($nm)){ $nm=$row.name_sq }
  $brandSrc = @($nm,$row.operator,$row.network) | Where-Object { $_ } | Select-Object -First 1
  $brand=Get-Brand $brandSrc
  if([string]::IsNullOrWhiteSpace($nm)){ $nm = if($am -eq 'atm'){ if($brand -ne 'E panjohur'){"ATM - $brand"}else{'ATM'} } else { '(pa emer)' } }
  $id="$($row.osm_id)"
  $merged[$id]=[pscustomobject]@{
    osm_id=$id; fclass=$am; name=$nm; banka=$brand
    komuna=(Which-Komuna $lon $lat); lon=$lon; lat=$lat
  }
}
Write-Host ("   HOTOSM kategorite: " + (($catCount.GetEnumerator()|Sort-Object Value -Descending|ForEach-Object{"$($_.Key)=$($_.Value)"}) -join ', '))
$hotBank=($merged.Values|Where-Object{$_.fclass -eq 'bank'}).Count
$hotAtm =($merged.Values|Where-Object{$_.fclass -eq 'atm'}).Count
Write-Host "   -> u morren $hotBank banka, $hotAtm ATM"

# ---------- 3) Te dhenat ekzistuese (union, dedup sipas osm_id) ----------
Write-Host "3/5 Bashkim me te dhenat ekzistuese (dedup sipas osm_id) ..."
$addedOld=0
foreach($file in @("bankat.geojson","atm.geojson")){
  $fp=Join-Path $out $file
  if(-not (Test-Path $fp)){ continue }
  $j=Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach($f in $j.features){
    $id="$($f.properties.osm_id)"
    if($merged.ContainsKey($id)){ continue }   # HOTOSM (me i ri) ka prioritet
    $c=$f.geometry.coordinates
    $merged[$id]=[pscustomobject]@{
      osm_id=$id; fclass=$f.properties.fclass; name=$f.properties.name; banka=$f.properties.banka
      komuna=(Which-Komuna $c[0] $c[1]); lon=$c[0]; lat=$c[1]
    }
    $addedOld++
  }
}
Write-Host "   -> u shtuan $addedOld pika qe ekzistonin vetem te te vjetrat"

# ---------- 4) Backup + ndarje sipas kategorise ----------
Write-Host "4/5 Backup i te vjetrave + ndarje bank/atm ..."
foreach($file in @("bankat.geojson","atm.geojson")){
  $fp=Join-Path $out $file
  if(Test-Path $fp){ Copy-Item $fp ($fp+".bak") -Force }
}
$bankFeat=$merged.Values|Where-Object{$_.fclass -eq 'bank'}|Sort-Object osm_id
$atmFeat =$merged.Values|Where-Object{$_.fclass -eq 'atm'}|Sort-Object osm_id

# ---------- 5) Shkrim GeoJSON ----------
Write-Host "5/5 Shkrim GeoJSON ..."
function JStr($s){ if($null -eq $s){return '""'}; '"'+($s -replace '\\','\\' -replace '"','\"')+'"' }
function Write-Points($features,$fclass,$file){
  $sb=[System.Text.StringBuilder]::new()
  [void]$sb.Append('{"type":"FeatureCollection","name":"'+$fclass+'","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
  $first=$true
  foreach($f in $features){
    if(-not $first){ [void]$sb.Append(',') }; $first=$false
    [void]$sb.Append('{"type":"Feature","properties":{')
    [void]$sb.Append('"osm_id":'+(JStr $f.osm_id)+',"fclass":'+(JStr $fclass)+',"name":'+(JStr $f.name)+',"banka":'+(JStr $f.banka)+',"komuna":'+(JStr $f.komuna))
    [void]$sb.Append('},"geometry":{"type":"Point","coordinates":['+$f.lon+','+$f.lat+']}}')
  }
  [void]$sb.Append(']}')
  [System.IO.File]::WriteAllText($file,$sb.ToString(),[System.Text.UTF8Encoding]::new($false))
}
Write-Points $bankFeat "bank" (Join-Path $out "bankat.geojson")
Write-Points $atmFeat  "atm"  (Join-Path $out "atm.geojson")

# ---------- Raport ----------
Write-Host ""
Write-Host "PERFUNDOI."
Write-Host ("   Banka (kombinuar): {0}" -f $bankFeat.Count)
Write-Host ("   ATM   (kombinuar): {0}" -f $atmFeat.Count)
Write-Host ""
Write-Host "Banka per komune (top 12):"
$byKom=@{}; foreach($f in $bankFeat){ if($f.komuna){ $byKom[$f.komuna]=1+[int]$byKom[$f.komuna] } }
$byKom.GetEnumerator()|Sort-Object Value -Descending|Select-Object -First 12|ForEach-Object{ Write-Host ("   {0,-16} {1}" -f $_.Key,$_.Value) }
Write-Host ""
Write-Host ("Drenas: banka={0}, atm={1}" -f ([int]$byKom['Drenas']), (($atmFeat|Where-Object{$_.komuna -eq 'Drenas'}).Count))
