# ============================================================================
#  Ndertimi i SHAPEFILE BAZE te projektit (Banka & ATM & Transfere, Kosove)
#  Burimet:
#    - HOTOSM financial services (Shapefiles/Bankk/...)  [primar, me i ri]
#    - Bankat.shp + ATM.shp (origjinalet OSM)            [union sipas osm_id]
#  Filtrim (kerkese):
#    - largohen "bankat" e dyshimta (pa marke / emra te gabuar / mikrofinanca)
#    - mbahen vetem: BANKA kryesore + ATM + TRANSFERE (Western Union, Ria, etj.)
#  Dalje:
#    - 1 shapefile baze: Shapefiles/Shapefile_Baze/banka_atm_kosove.{shp,shx,dbf,prj,cpg}
#      (fusha: osm_id, fclass[bank|atm|transfer], name, banka, komuna)
#    - GeoJSON per app: data/bankat.geojson, data/atm.geojson, data/transferet.geojson
# ============================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$shp  = Join-Path $root "Shapefiles"
$out  = Join-Path $root "data"
$hot  = Join-Path $shp "Bankk/hotosm_xkx_financial_services_points_shp/hotosm_xkx_financial_services_points_shp"
$projDir = Join-Path $shp "Projekti"
if(-not (Test-Path $projDir)){ New-Item -ItemType Directory -Path $projDir | Out-Null }
$enc = [System.Text.Encoding]::UTF8

# ---------- Lexues binar ----------
function Read-DBFTable($path){
  $b=[System.IO.File]::ReadAllBytes($path)
  $numRec=[BitConverter]::ToUInt32($b,4);$headerSize=[BitConverter]::ToUInt16($b,8);$recSize=[BitConverter]::ToUInt16($b,10)
  $fields=@();$pos=32
  while($b[$pos] -ne 0x0D){ $fields+=[pscustomobject]@{name=[System.Text.Encoding]::ASCII.GetString($b,$pos,11).TrimEnd([char]0);len=$b[$pos+16]}; $pos+=32 }
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
    if([BitConverter]::ToInt32($b,$c) -eq 1){ [void]$pts.Add([pscustomobject]@{x=[BitConverter]::ToDouble($b,$c+4);y=[BitConverter]::ToDouble($b,$c+12)}) }
    else { [void]$pts.Add($null) }
    $pos=$c+$contentLen
  }
  return $pts
}

# ---------- Klasifikimi (kthen {fclass;banka} ose $null per t'u hequr) ----------
function Classify($amenity,$name,$operator,$network){
  $t = (@($name,$operator,$network) -join ' ').ToLower()
  # 1) Transfere te qarta sipas amenity
  if($amenity -eq 'money_transfer' -or $amenity -eq 'bureau_de_change'){ return [pscustomobject]@{fclass='transfer';banka=(Get-TransferBrand $t)} }
  # 2) ATM
  if($amenity -eq 'atm'){
    $b=Get-BankBrand $t; if($b -eq 'E panjohur'){ $b=(Get-TransferBrand $t); if($b -eq 'Transfer / Këmbim'){ $b='E panjohur' } }
    return [pscustomobject]@{fclass='atm';banka=$b}
  }
  # 3) Banka: vetem markat kryesore mbahen si 'bank'
  if($amenity -eq 'bank'){
    $b=Get-BankBrand $t
    if($b -ne 'E panjohur'){ return [pscustomobject]@{fclass='bank';banka=$b} }
    if(Test-Transfer $t){ return [pscustomobject]@{fclass='transfer';banka=(Get-TransferBrand $t)} }
    return $null   # bankë e dyshimtë -> hiqet
  }
  return $null
}
function Get-BankBrand($t){
  if($t -match 'raif'){ return 'Raiffeisen Bank' }
  if($t -match 'procredit|pro credit'){ return 'ProCredit Bank' }
  if($t -match '\bteb\b|t\.e\.b'){ return 'TEB' }
  if($t -match '\bnlb\b'){ return 'NLB Banka' }
  if($t -match '\bbpb\b|per biznes|për biznes'){ return 'Banka per Biznes (BPB)' }
  if($t -match 'ekonomik'){ return 'Banka Ekonomike' }
  if($t -match 'kombetare|kombëtare|\bbkt\b'){ return 'BKT' }
  if($t -match 'credins'){ return 'Credins Bank' }
  if($t -match 'ziraat'){ return 'Ziraat Bank' }
  if($t -match 'isbank|işbank'){ return 'Isbank' }
  if($t -match 'komercijalna'){ return 'Komercijalna Banka' }
  if($t -match 'poštanska|postanska|штедионица'){ return 'Poštanska štedionica' }
  if($t -match 'narodna banka'){ return 'Narodna banka Srbije' }
  if($t -match 'qendrore'){ return 'Banka Qendrore e Kosovës' }
  return 'E panjohur'
}
function Test-Transfer($t){
  return ($t -match 'western union|unionnet|union net|union western|money\s?gram|moneta|\bria\b|capital|vllesa|ecodex|kembim|këmbim|kembyes|kembimore|menjacnica|menjačnica|bilanci|\brifa\b|\bibas\b|transfer|moneygram|xoom|paysera')
}
function Get-TransferBrand($t){
  if($t -match 'western union|unionnet|union net|union western'){ return 'Western Union' }
  if($t -match 'money\s?gram|moneygram|moneta'){ return 'MoneyGram' }
  if($t -match '\bria\b|capital|vllesa|ecodex'){ return 'Ria / Capital' }
  if($t -match 'kembim|këmbim|kembyes|kembimore|menjacnica|menjačnica|bilanci|\brifa\b|kemi'){ return 'Këmbimore' }
  return 'Transfer / Këmbim'
}

# ---------- Point-in-polygon (komunat nga data/komunat.geojson, 4326) ----------
$komJson = Get-Content (Join-Path $out "komunat.geojson") -Raw -Encoding UTF8 | ConvertFrom-Json
$komIndex=@()
foreach($f in $komJson.features){
  $rings=New-Object System.Collections.ArrayList
  foreach($poly in $f.geometry.coordinates){ foreach($ring in $poly){ [void]$rings.Add($ring) } }
  $komIndex+=[pscustomobject]@{ name=$f.properties.name; rings=$rings }
}
function Point-In-Ring($lon,$lat,$ring){
  $inside=$false;$n=$ring.Count;$j=$n-1
  for($i=0;$i -lt $n;$i++){
    $xi=$ring[$i][0];$yi=$ring[$i][1];$xj=$ring[$j][0];$yj=$ring[$j][1]
    if((($yi -gt $lat) -ne ($yj -gt $lat)) -and ($lon -lt ($xj-$xi)*($lat-$yi)/($yj-$yi)+$xi)){ $inside=-not $inside }
    $j=$i
  }
  return $inside
}
function Which-Komuna($lon,$lat){
  foreach($k in $script:komIndex){ foreach($r in $k.rings){ if(Point-In-Ring $lon $lat $r){ return $k.name } } }
  return ''
}

# ---------- 1) HOTOSM ----------
Write-Host "1/4 HOTOSM: lexim + klasifikim + filtrim ..."
$hDbf=Read-DBFTable ($hot+".dbf"); $hPts=Read-SHPPoints ($hot+".shp")
$merged=@{}; $dropped=0
for($i=0;$i -lt $hPts.Count;$i++){
  $g=$hPts[$i]; if($null -eq $g){ continue }
  $row=$hDbf[$i]
  $cl=Classify $row.amenity $row.name $row.operator $row.network
  if($null -eq $cl){ $dropped++; continue }
  $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
  $nm=$row.name; if([string]::IsNullOrWhiteSpace($nm)){ $nm=$row.name_sq }
  if([string]::IsNullOrWhiteSpace($nm)){
    $nm = switch($cl.fclass){ 'atm' {'ATM'} 'transfer' {$cl.banka} default {'(pa emer)'} }
  }
  $id="$($row.osm_id)"
  $merged[$id]=[pscustomobject]@{ osm_id=$id; fclass=$cl.fclass; name=$nm; banka=$cl.banka; komuna=(Which-Komuna $lon $lat); lon=$lon; lat=$lat }
}
Write-Host "   -> u hoqen $dropped pika te dyshimta (bankë pa markë / mikrofinancë / emra gabim)"

# ---------- 2) Union me origjinalet (Bankat.shp + ATM.shp) ----------
Write-Host "2/4 Union me origjinalet OSM (dedup sipas osm_id) ..."
$addedOld=0
foreach($src in @(@{p="Bankat/Bankat";am="bank"}, @{p="ATM/ATM";am="atm"})){
  $dbf=Read-DBFTable (Join-Path $shp ($src.p+".dbf")); $pts=Read-SHPPoints (Join-Path $shp ($src.p+".shp"))
  for($i=0;$i -lt $pts.Count;$i++){
    $g=$pts[$i]; if($null -eq $g){ continue }
    $id="$($dbf[$i].osm_id)"; if($merged.ContainsKey($id)){ continue }
    $cl=Classify $src.am $dbf[$i].name $null $null
    if($null -eq $cl){ continue }
    $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
    $nm=$dbf[$i].name; if([string]::IsNullOrWhiteSpace($nm)){ $nm= if($cl.fclass -eq 'atm'){'ATM'}else{'(pa emer)'} }
    $merged[$id]=[pscustomobject]@{ osm_id=$id; fclass=$cl.fclass; name=$nm; banka=$cl.banka; komuna=(Which-Komuna $lon $lat); lon=$lon; lat=$lat }
    $addedOld++
  }
}
Write-Host "   -> u shtuan $addedOld pika qe ekzistonin vetem te origjinalet"

$all = $merged.Values | Sort-Object fclass,osm_id
$bankF = @($all | Where-Object {$_.fclass -eq 'bank'})
$atmF  = @($all | Where-Object {$_.fclass -eq 'atm'})
$trF   = @($all | Where-Object {$_.fclass -eq 'transfer'})
Write-Host ("   Totali: {0} banka, {1} ATM, {2} transfere" -f $bankF.Count,$atmF.Count,$trF.Count)

# ============================================================================
#  3) Shkrim SHAPEFILE BAZE (SHP + SHX + DBF + PRJ + CPG)
# ============================================================================
Write-Host "3/4 Shkrim shapefile baze ..."
function BE([int]$v){ $b=[BitConverter]::GetBytes($v);[array]::Reverse($b);return $b }
function LEi([int]$v){ return [BitConverter]::GetBytes($v) }
function LEd([double]$v){ return [BitConverter]::GetBytes($v) }

$feats = @($all)
$n = $feats.Count

# --- SHP ---
$shpMs=New-Object System.IO.MemoryStream
$shpW=New-Object System.IO.BinaryWriter($shpMs)
$shxMs=New-Object System.IO.MemoryStream
$shxW=New-Object System.IO.BinaryWriter($shxMs)
# headers (100 byte) - mbushen me zero tani, plotesohen me vone
$shpW.Write((New-Object byte[] 100)); $shxW.Write((New-Object byte[] 100))
$xmin=[double]::MaxValue;$ymin=[double]::MaxValue;$xmax=[double]::MinValue;$ymax=[double]::MinValue
for($i=0;$i -lt $n;$i++){
  $f=$feats[$i]; $x=[double]$f.lon; $y=[double]$f.lat
  if($x -lt $xmin){$xmin=$x}; if($x -gt $xmax){$xmax=$x}; if($y -lt $ymin){$ymin=$y}; if($y -gt $ymax){$ymax=$y}
  $offWords = [int]($shpMs.Position/2)
  # rekord SHP: header (BE recNum, BE contentLenWords=10) + content(20 byte)
  $shpW.Write((BE ($i+1))); $shpW.Write((BE 10))
  $shpW.Write((LEi 1)); $shpW.Write((LEd $x)); $shpW.Write((LEd $y))
  # rekord SHX: BE offsetWords, BE contentLenWords
  $shxW.Write((BE $offWords)); $shxW.Write((BE 10))
}
$shpW.Flush(); $shxW.Flush()
$shpBytes=$shpMs.ToArray(); $shxBytes=$shxMs.ToArray()
function Patch-Header([byte[]]$arr){
  [Array]::Copy((BE 9994),0,$arr,0,4)                       # file code
  [Array]::Copy((BE ([int]($arr.Length/2))),0,$arr,24,4)    # file length (words)
  [Array]::Copy((LEi 1000),0,$arr,28,4)                     # version
  [Array]::Copy((LEi 1),0,$arr,32,4)                        # shape type = point
  [Array]::Copy((LEd $xmin),0,$arr,36,8); [Array]::Copy((LEd $ymin),0,$arr,44,8)
  [Array]::Copy((LEd $xmax),0,$arr,52,8); [Array]::Copy((LEd $ymax),0,$arr,60,8)
  # Z/M = 0 (tashme zero)
}
Patch-Header $shpBytes; Patch-Header $shxBytes
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_kosove.shp"),$shpBytes)
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_kosove.shx"),$shxBytes)

# --- DBF (UTF-8) ---
$dbfFields=@(
  @{name='osm_id';len=20}, @{name='fclass';len=10}, @{name='name';len=100}, @{name='banka';len=40}, @{name='komuna';len=30}
)
$recSize = 1 + ($dbfFields | Measure-Object -Property len -Sum).Sum
$headerSize = 32 + 32*$dbfFields.Count + 1
$dbfMs=New-Object System.IO.MemoryStream
$dbfW=New-Object System.IO.BinaryWriter($dbfMs)
$now=Get-Date
$dbfW.Write([byte]0x03)
$dbfW.Write([byte]($now.Year-1900)); $dbfW.Write([byte]$now.Month); $dbfW.Write([byte]$now.Day)
$dbfW.Write([BitConverter]::GetBytes([uint32]$n))
$dbfW.Write([BitConverter]::GetBytes([uint16]$headerSize))
$dbfW.Write([BitConverter]::GetBytes([uint16]$recSize))
$dbfW.Write((New-Object byte[] 20))   # reserved
foreach($fl in $dbfFields){
  $nb=New-Object byte[] 11
  $src=[System.Text.Encoding]::ASCII.GetBytes($fl.name)
  [Array]::Copy($src,0,$nb,0,[Math]::Min(11,$src.Length))
  $dbfW.Write($nb)
  $dbfW.Write([byte][char]'C')              # tip Character
  $dbfW.Write((New-Object byte[] 4))        # field data address
  $dbfW.Write([byte]$fl.len)                # length
  $dbfW.Write([byte]0)                       # decimal count
  $dbfW.Write((New-Object byte[] 14))       # reserved
}
$dbfW.Write([byte]0x0D)                      # header terminator
function Pad-Field([string]$s,[int]$len){
  if($null -eq $s){$s=''}
  $bytes=$enc.GetBytes($s)
  while($bytes.Length -gt $len){ $s=$s.Substring(0,$s.Length-1); $bytes=$enc.GetBytes($s) }
  $buf=New-Object byte[] $len
  for($k=0;$k -lt $len;$k++){ $buf[$k]=0x20 }
  [Array]::Copy($bytes,0,$buf,0,$bytes.Length)
  return $buf
}
foreach($f in $feats){
  $dbfW.Write([byte]0x20)   # deletion flag (space = aktiv)
  $dbfW.Write((Pad-Field $f.osm_id 20))
  $dbfW.Write((Pad-Field $f.fclass 10))
  $dbfW.Write((Pad-Field $f.name 100))
  $dbfW.Write((Pad-Field $f.banka 40))
  $dbfW.Write((Pad-Field $f.komuna 30))
}
$dbfW.Write([byte]0x1A)   # EOF
$dbfW.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_kosove.dbf"),$dbfMs.ToArray())

# --- PRJ + CPG ---
$prj='GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
[System.IO.File]::WriteAllText((Join-Path $projDir "banka_atm_kosove.prj"),$prj,[System.Text.ASCIIEncoding]::new())
[System.IO.File]::WriteAllText((Join-Path $projDir "banka_atm_kosove.cpg"),"UTF-8",[System.Text.ASCIIEncoding]::new())
Write-Host "   -> Shapefiles/Shapefile_Baze/banka_atm_kosove.* ($n pika)"

# ============================================================================
#  4) GeoJSON per app
# ============================================================================
Write-Host "4/4 Shkrim GeoJSON (bank/atm/transfer) ..."
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
foreach($file in @("bankat.geojson","atm.geojson","transferet.geojson")){
  $fp=Join-Path $out $file; if(Test-Path $fp){ Copy-Item $fp ($fp+".bak") -Force }
}
Write-Points $bankF "bank"     (Join-Path $out "bankat.geojson")
Write-Points $atmF  "atm"      (Join-Path $out "atm.geojson")
Write-Points $trF   "transfer" (Join-Path $out "transferet.geojson")

Write-Host ""
Write-Host "PERFUNDOI."
Write-Host ("   Banka: {0} | ATM: {1} | Transfere: {2}" -f $bankF.Count,$atmF.Count,$trF.Count)
Write-Host ""
Write-Host "Banka kryesore sipas markes:"
$bm=@{}; foreach($f in $bankF){ $bm[$f.banka]=1+[int]$bm[$f.banka] }
$bm.GetEnumerator()|Sort-Object Value -Descending|ForEach-Object{ Write-Host ("   {0,-26} {1}" -f $_.Key,$_.Value) }
