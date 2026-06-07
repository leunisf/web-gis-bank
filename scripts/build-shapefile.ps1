# ============================================================================
#  Ndertimi i NJE shapefile baze nga 3 GeoJSON-et e pastruar:
#    data/bankat.geojson + data/atm.geojson + data/transferet.geojson
#  -> Shapefiles/Projekti/banka_atm_transfer.{shp,shx,dbf,prj,cpg}
#  Fusha: osm_id, fclass (bank|atm|transfer), name, banka, komuna. WGS84/UTF-8.
#  Vetem ASCII ne skript. Te dhenat lexohen nga JSON (s'ka klasifikim/riprojektim).
# ============================================================================
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$out=Join-Path $root "data"
$projDir=Join-Path $root "Shapefiles/Projekti"
if(-not (Test-Path $projDir)){ New-Item -ItemType Directory -Path $projDir | Out-Null }
$enc=[System.Text.Encoding]::UTF8

# ---------- Mblidh pikat nga 3 GeoJSON ----------
$feats=New-Object System.Collections.ArrayList
foreach($file in @("bankat.geojson","atm.geojson","transferet.geojson")){
  $j=Get-Content (Join-Path $out $file) -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach($f in $j.features){
    $p=$f.properties; $c=$f.geometry.coordinates
    [void]$feats.Add([pscustomobject]@{ osm_id="$($p.osm_id)"; fclass=$p.fclass; name=$p.name; banka=$p.banka; komuna=$p.komuna; lon=[double]$c[0]; lat=[double]$c[1] })
  }
}
$n=$feats.Count
Write-Host "U mblodhen $n pika nga 3 GeoJSON."

# ---------- Ndihmes binare ----------
function BE([int]$v){ $b=[BitConverter]::GetBytes($v);[array]::Reverse($b);return $b }
function LEi([int]$v){ return [BitConverter]::GetBytes($v) }
function LEd([double]$v){ return [BitConverter]::GetBytes($v) }
# Shkruan SAKTE nje byte[] (shmang ri-kutizimin e PowerShell qe e kthen ne Object[])
function W($writer,$bytes){ $bb=[byte[]]$bytes; $writer.Write($bb,0,$bb.Length) }

# ---------- SHP + SHX ----------
$shpMs=New-Object System.IO.MemoryStream; $shpW=New-Object System.IO.BinaryWriter($shpMs)
$shxMs=New-Object System.IO.MemoryStream; $shxW=New-Object System.IO.BinaryWriter($shxMs)
W $shpW (New-Object byte[] 100); W $shxW (New-Object byte[] 100)
$xmin=[double]::MaxValue;$ymin=[double]::MaxValue;$xmax=[double]::MinValue;$ymax=[double]::MinValue
for($i=0;$i -lt $n;$i++){
  $f=$feats[$i]; $x=$f.lon; $y=$f.lat
  if($x -lt $xmin){$xmin=$x}; if($x -gt $xmax){$xmax=$x}; if($y -lt $ymin){$ymin=$y}; if($y -gt $ymax){$ymax=$y}
  $offWords=[int]($shpMs.Position/2)
  W $shpW (BE ($i+1)); W $shpW (BE 10)            # recNum, contentLen(words)
  W $shpW (LEi 1); W $shpW (LEd $x); W $shpW (LEd $y)  # Point
  W $shxW (BE $offWords); W $shxW (BE 10)
}
$shpW.Flush(); $shxW.Flush()
$shpBytes=$shpMs.ToArray(); $shxBytes=$shxMs.ToArray()
function Patch-Header([byte[]]$arr){
  [Array]::Copy((BE 9994),0,$arr,0,4)
  [Array]::Copy((BE ([int]($arr.Length/2))),0,$arr,24,4)
  [Array]::Copy((LEi 1000),0,$arr,28,4)
  [Array]::Copy((LEi 1),0,$arr,32,4)
  [Array]::Copy((LEd $xmin),0,$arr,36,8); [Array]::Copy((LEd $ymin),0,$arr,44,8)
  [Array]::Copy((LEd $xmax),0,$arr,52,8); [Array]::Copy((LEd $ymax),0,$arr,60,8)
}
Patch-Header $shpBytes; Patch-Header $shxBytes
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_transfer.shp"),$shpBytes)
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_transfer.shx"),$shxBytes)

# ---------- DBF (UTF-8) ----------
$dbfFields=@(@{name='osm_id';len=20},@{name='fclass';len=10},@{name='name';len=100},@{name='banka';len=40},@{name='komuna';len=30})
$recSize=1; foreach($fl in $dbfFields){ $recSize+=$fl.len }
$headerSize=32+32*$dbfFields.Count+1
$dbfMs=New-Object System.IO.MemoryStream; $dbfW=New-Object System.IO.BinaryWriter($dbfMs)
$now=Get-Date
$dbfW.Write([byte]0x03)
$dbfW.Write([byte]($now.Year-1900)); $dbfW.Write([byte]$now.Month); $dbfW.Write([byte]$now.Day)
W $dbfW ([BitConverter]::GetBytes([uint32]$n))
W $dbfW ([BitConverter]::GetBytes([uint16]$headerSize))
W $dbfW ([BitConverter]::GetBytes([uint16]$recSize))
W $dbfW (New-Object byte[] 20)
foreach($fl in $dbfFields){
  $nb=New-Object byte[] 11; $src=[System.Text.Encoding]::ASCII.GetBytes($fl.name)
  [Array]::Copy($src,0,$nb,0,[Math]::Min(11,$src.Length)); W $dbfW $nb
  $dbfW.Write([byte][char]'C'); W $dbfW (New-Object byte[] 4)
  $dbfW.Write([byte]$fl.len); $dbfW.Write([byte]0); W $dbfW (New-Object byte[] 14)
}
$dbfW.Write([byte]0x0D)
function Pad-Field([string]$s,[int]$len){
  if($null -eq $s){$s=''}
  $bytes=$enc.GetBytes($s)
  while($bytes.Length -gt $len){ $s=$s.Substring(0,$s.Length-1); $bytes=$enc.GetBytes($s) }
  $buf=New-Object byte[] $len; for($k=0;$k -lt $len;$k++){ $buf[$k]=0x20 }
  [Array]::Copy($bytes,0,$buf,0,$bytes.Length); return $buf
}
foreach($f in $feats){
  $dbfW.Write([byte]0x20)
  W $dbfW (Pad-Field $f.osm_id 20); W $dbfW (Pad-Field $f.fclass 10)
  W $dbfW (Pad-Field $f.name 100); W $dbfW (Pad-Field $f.banka 40)
  W $dbfW (Pad-Field $f.komuna 30)
}
$dbfW.Write([byte]0x1A); $dbfW.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $projDir "banka_atm_transfer.dbf"),$dbfMs.ToArray())

# ---------- PRJ + CPG ----------
$prj='GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
[System.IO.File]::WriteAllText((Join-Path $projDir "banka_atm_transfer.prj"),$prj,[System.Text.ASCIIEncoding]::new())
[System.IO.File]::WriteAllText((Join-Path $projDir "banka_atm_transfer.cpg"),"UTF-8",[System.Text.ASCIIEncoding]::new())

$nb=($feats|Where-Object{$_.fclass -eq 'bank'}).Count
$na=($feats|Where-Object{$_.fclass -eq 'atm'}).Count
$nt=($feats|Where-Object{$_.fclass -eq 'transfer'}).Count
Write-Host "PERFUNDOI. Shapefiles/Projekti/banka_atm_transfer.shp"
Write-Host ("   bank={0}, atm={1}, transfer={2}, GJITHSEJ={3}" -f $nb,$na,$nt,$n)
