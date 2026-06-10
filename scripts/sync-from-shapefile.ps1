# ============================================================================
#  Sinkronizim i kundert: SHAPEFILE -> GeoJSON
#  Lexon Shapefiles/Shapefile_Baze/banka_atm_transfer.{shp,dbf} (te modifikuar
#  ne QGIS) dhe rigjeneron data/{bankat,atm,transferet}.geojson qe perdor faqja.
#  Komuna rikalkulohet me point-in-polygon VETEM kur fusha eshte bosh (pika e re).
#  ASCII-only (PowerShell 5.1 e lexon .ps1 si ANSI).
# ============================================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root "data"
$base = Join-Path $root "Shapefiles/Shapefile_Baze/banka_atm_transfer"

# ---------- Lexues binar (njejte si combine-data.ps1) ----------
# Lexim me FileShare.ReadWrite qe te mos pengohet kur QGIS e ka skedarin te hapur.
function Read-AllBytesShared($path){
  $fs=[System.IO.File]::Open($path,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
  try{
    $len=[int]$fs.Length; $buf=New-Object byte[] $len; $tot=0
    while($tot -lt $len){ $n=$fs.Read($buf,$tot,$len-$tot); if($n -le 0){ break }; $tot+=$n }
    return $buf
  } finally{ $fs.Close() }
}
function Read-DBFTable($path){
  $b=Read-AllBytesShared $path
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
# Lexon pikat duke perdorur offset-et e .shx (i qendrueshem edhe kur ecja sekuenciale
# ne .shp deshton; cdo rekord lokalizohet sakte permes indeksit). Rendi perputhet 1:1 me .dbf.
function Read-SHPPoints($shpPath){
  $b   = Read-AllBytesShared $shpPath
  $shx = Read-AllBytesShared ([System.IO.Path]::ChangeExtension($shpPath,'.shx'))
  $nrec = [int](($shx.Length - 100) / 8)
  $pts = New-Object System.Collections.ArrayList
  for($i=0; $i -lt $nrec; $i++){
    $off = (Read-BE-Int32 $shx (100 + $i*8)) * 2     # offset i rekordit ne byte brenda .shp
    if(($off + 12) -gt $b.Length){ [void]$pts.Add($null); continue }
    $st = [BitConverter]::ToInt32($b, $off+8)         # shape type (1=Point, 0=Null)
    if($st -eq 1 -and ($off + 28) -le $b.Length){
      $x = [BitConverter]::ToDouble($b, $off+12); $y = [BitConverter]::ToDouble($b, $off+20)
      [void]$pts.Add([pscustomobject]@{x=$x; y=$y})
    } else { [void]$pts.Add($null) }
  }
  return $pts
}

# ---------- Point-in-polygon per komunen ----------
function Point-In-Ring($lon,$lat,$ring){
  $inside=$false;$n=$ring.Count;$j=$n-1
  for($i=0;$i -lt $n;$i++){
    $xi=$ring[$i][0];$yi=$ring[$i][1];$xj=$ring[$j][0];$yj=$ring[$j][1]
    if((($yi -gt $lat) -ne ($yj -gt $lat)) -and ($lon -lt ($xj-$xi)*($lat-$yi)/($yj-$yi)+$xi)){ $inside=-not $inside }
    $j=$i
  }
  return $inside
}
Write-Host "1/4 Indeks komunash (point-in-polygon) ..."
$komJson = Get-Content (Join-Path $out "komunat.geojson") -Raw -Encoding UTF8 | ConvertFrom-Json
$script:komIndex=@()
foreach($f in $komJson.features){
  $rings=New-Object System.Collections.ArrayList
  foreach($poly in $f.geometry.coordinates){ foreach($ring in $poly){ [void]$rings.Add($ring) } }
  $script:komIndex+=[pscustomobject]@{ name=$f.properties.name; rings=$rings }
}
function Which-Komuna($lon,$lat){
  foreach($k in $script:komIndex){ foreach($r in $k.rings){ if(Point-In-Ring $lon $lat $r){ return $k.name } } }
  return ''
}

# ---------- Lexim i shapefile-it te modifikuar ----------
Write-Host "2/4 Lexim i banka_atm_transfer.{shp,dbf} ..."
$dbf=Read-DBFTable ($base+".dbf")
$pts=Read-SHPPoints ($base+".shp")
$feats=New-Object System.Collections.ArrayList
$recalc=0
for($i=0;$i -lt $pts.Count;$i++){
  $g=$pts[$i]; if($null -eq $g){ continue }
  $row=$dbf[$i]
  $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
  $kom=$row.komuna
  if([string]::IsNullOrWhiteSpace($kom)){ $kom=(Which-Komuna $lon $lat); $recalc++ }
  [void]$feats.Add([pscustomobject]@{
    osm_id="$($row.osm_id)"; fclass=$row.fclass; name=$row.name; banka=$row.banka; komuna=$kom; lon=$lon; lat=$lat
  })
}
Write-Host "   -> $($feats.Count) pika gjithsej; komuna u rikalkulua per $recalc pika (te reja/bosh)"

# ---------- Backup + ndarje + shkrim ----------
Write-Host "3/4 Backup i GeoJSON-eve ekzistuese (vetem hera e pare ruan origjinalin) ..."
foreach($file in @("bankat.geojson","atm.geojson","transferet.geojson")){
  $fp=Join-Path $out $file
  if((Test-Path $fp) -and -not (Test-Path ($fp+".bak"))){ Copy-Item $fp ($fp+".bak") -Force }
}
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
Write-Host "4/4 Shkrim GeoJSON ..."
$bankFeat=$feats|Where-Object{$_.fclass -eq 'bank'}|Sort-Object osm_id
$atmFeat =$feats|Where-Object{$_.fclass -eq 'atm'}|Sort-Object osm_id
$trFeat  =$feats|Where-Object{$_.fclass -eq 'transfer'}|Sort-Object osm_id
Write-Points $bankFeat "bank"     (Join-Path $out "bankat.geojson")
Write-Points $atmFeat  "atm"      (Join-Path $out "atm.geojson")
Write-Points $trFeat   "transfer" (Join-Path $out "transferet.geojson")

# ---------- 5) Rifreskim i numrave per komune (banka_count/atm_count te choropleth) ----------
# Zevendesim tekstual te bllokut "properties" per cdo komune, qe gjeometria te mbetet e paprekur.
Write-Host "5/5 Rifreskim banka_count/atm_count ne komunat.geojson ..."
$bankByKom=@{}; foreach($f in $bankFeat){ if($f.komuna){ $bankByKom[$f.komuna]=1+[int]$bankByKom[$f.komuna] } }
$atmByKom=@{};  foreach($f in $atmFeat){  if($f.komuna){ $atmByKom[$f.komuna]=1+[int]$atmByKom[$f.komuna] } }
$komPath=Join-Path $out "komunat.geojson"
if(-not (Test-Path ($komPath+".bak"))){ Copy-Item $komPath ($komPath+".bak") -Force }
$txt=[System.IO.File]::ReadAllText($komPath,[System.Text.Encoding]::UTF8)
$rx=[regex]'"name":"(?<n>[^"]*)","banka_count":\d+,"atm_count":\d+'
$txt=$rx.Replace($txt,{ param($m)
  $nm=$m.Groups['n'].Value
  $nb=[int]$bankByKom[$nm]; $na=[int]$atmByKom[$nm]
  '"name":"'+$nm+'","banka_count":'+$nb+',"atm_count":'+$na
})
[System.IO.File]::WriteAllText($komPath,$txt,[System.Text.UTF8Encoding]::new($false))

# ---------- Raport ----------
Write-Host ""
Write-Host "PERFUNDOI."
Write-Host ("   Banka:     {0}" -f $bankFeat.Count)
Write-Host ("   ATM:       {0}" -f $atmFeat.Count)
Write-Host ("   Transfere: {0}" -f $trFeat.Count)
$trViti=($trFeat|Where-Object{$_.komuna -eq 'Viti'}).Count
$bankPr=($bankFeat|Where-Object{$_.komuna -eq 'Prishtine' -or $_.komuna -eq 'Prishtinë'}).Count
Write-Host ("   Transfere ne Viti:   {0}" -f $trViti)
Write-Host ("   Banka ne Prishtine:  {0}" -f $bankPr)
