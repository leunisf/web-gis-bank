# ============================================================================
#  Faza 0 - Pergatitja e te dhenave  (Detyre Web GIS: Banka & ATM, Kosove)
#  - Lexon shapefile-t (SHP+DBF) pa biblioteka te jashtme
#  - Riprojekton komunat nga KOSOVAREF01 (EPSG:6870, Transverse Mercator) -> WGS84 (EPSG:4326)
#  - Pastron emrat e bankave (normalizim marke)
#  - Cakton komunen per cdo banke/ATM (point-in-polygon)
#  - Shkruan GeoJSON ne ./data
#  Elementet matematike (pika 3): inverse Transverse Mercator, GRS80, k0=0.9999, CM=21, FE=7500000
# ============================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$shp  = Join-Path $root "Shapefiles"
$out  = Join-Path $root "data"
if(-not (Test-Path $out)){ New-Item -ItemType Directory -Path $out | Out-Null }

# ---------- Lexues binar ndihmes ----------
function Read-DBFTable($path){
  $b = [System.IO.File]::ReadAllBytes($path)
  $numRec = [BitConverter]::ToUInt32($b,4)
  $headerSize = [BitConverter]::ToUInt16($b,8)
  $recSize = [BitConverter]::ToUInt16($b,10)
  $fields=@(); $pos=32
  while($b[$pos] -ne 0x0D){
    $fields += [pscustomobject]@{ name=[System.Text.Encoding]::ASCII.GetString($b,$pos,11).TrimEnd([char]0); len=$b[$pos+16] }
    $pos+=32
  }
  $enc=[System.Text.Encoding]::UTF8
  $rows=@()
  for($r=0;$r -lt $numRec;$r++){
    $off=$headerSize + $r*$recSize + 1
    $row=@{}
    foreach($f in $fields){
      $row[$f.name]=$enc.GetString($b,$off,$f.len).Trim()
      $off+=$f.len
    }
    $rows += [pscustomobject]$row
  }
  return $rows
}

function Read-BE-Int32($b,$off){
  $t = $b[$off..($off+3)]; [array]::Reverse($t); return [BitConverter]::ToInt32($t,0)
}

# Lexon gjeometrine SHP. Kthen liste me objekte {type, points|rings}
function Read-SHPGeom($path){
  $b=[System.IO.File]::ReadAllBytes($path)
  $fileLen = (Read-BE-Int32 $b 24) * 2   # ne byte
  $pos=100
  $geoms=@()
  while($pos -lt $fileLen){
    $contentLen = (Read-BE-Int32 $b ($pos+4)) * 2
    $c = $pos + 8
    $shapeType = [BitConverter]::ToInt32($b,$c)
    if($shapeType -eq 1){ # Point
      $x=[BitConverter]::ToDouble($b,$c+4); $y=[BitConverter]::ToDouble($b,$c+12)
      $geoms += [pscustomobject]@{ type="point"; x=$x; y=$y }
    }
    elseif($shapeType -eq 5){ # Polygon
      $numParts=[BitConverter]::ToInt32($b,$c+36)
      $numPoints=[BitConverter]::ToInt32($b,$c+40)
      $partsOff=$c+44
      $parts=@(); for($i=0;$i -lt $numParts;$i++){ $parts += [BitConverter]::ToInt32($b,$partsOff+$i*4) }
      $pointsOff=$partsOff + $numParts*4
      $rings=@()
      for($p=0;$p -lt $numParts;$p++){
        $start=$parts[$p]
        $end= if($p -lt $numParts-1){ $parts[$p+1] } else { $numPoints }
        $ring=@()
        for($k=$start;$k -lt $end;$k++){
          $ox=[BitConverter]::ToDouble($b,$pointsOff+$k*16)
          $oy=[BitConverter]::ToDouble($b,$pointsOff+$k*16+8)
          $ring += ,@($ox,$oy)
        }
        $rings += ,$ring
      }
      $geoms += [pscustomobject]@{ type="polygon"; rings=$rings }
    }
    else {
      $geoms += [pscustomobject]@{ type="null" }
    }
    $pos = $c + $contentLen
  }
  return $geoms
}

# ---------- Inverse Transverse Mercator: KOSOVAREF01 -> lon/lat (deg) ----------
$a=6378137.0; $invf=298.257222101; $f=1.0/$invf
$e2=2*$f-$f*$f; $ep2=$e2/(1-$e2)
$k0=0.9999; $FE=7500000.0; $FN=0.0
$lon0=21.0*[Math]::PI/180.0
function Inv-TM($E,$N){
  $x=$E-$script:FE; $y=$N-$script:FN
  $M=$y/$script:k0
  $a=$script:a; $e2=$script:e2; $ep2=$script:ep2
  $mu=$M/($a*(1-$e2/4-3*$e2*$e2/64-5*[Math]::Pow($e2,3)/256))
  $e1=(1-[Math]::Sqrt(1-$e2))/(1+[Math]::Sqrt(1-$e2))
  $phi1=$mu + (3*$e1/2-27*[Math]::Pow($e1,3)/32)*[Math]::Sin(2*$mu) `
      + (21*$e1*$e1/16-55*[Math]::Pow($e1,4)/32)*[Math]::Sin(4*$mu) `
      + (151*[Math]::Pow($e1,3)/96)*[Math]::Sin(6*$mu) `
      + (1097*[Math]::Pow($e1,4)/512)*[Math]::Sin(8*$mu)
  $sp=[Math]::Sin($phi1); $cp=[Math]::Cos($phi1); $tp=[Math]::Tan($phi1)
  $C1=$ep2*$cp*$cp; $T1=$tp*$tp
  $N1=$a/[Math]::Sqrt(1-$e2*$sp*$sp)
  $R1=$a*(1-$e2)/[Math]::Pow(1-$e2*$sp*$sp,1.5)
  $D=$x/($N1*$script:k0)
  $lat=$phi1 - ($N1*$tp/$R1)*($D*$D/2 `
      - (5+3*$T1+10*$C1-4*$C1*$C1-9*$ep2)*[Math]::Pow($D,4)/24 `
      + (61+90*$T1+298*$C1+45*$T1*$T1-252*$ep2-3*$C1*$C1)*[Math]::Pow($D,6)/720)
  $lon=$script:lon0 + ($D-(1+2*$T1+$C1)*[Math]::Pow($D,3)/6 `
      + (5-2*$C1+28*$T1-3*$C1*$C1+8*$ep2+24*$T1*$T1)*[Math]::Pow($D,5)/120)/$cp
  return ,@([Math]::Round($lon*180.0/[Math]::PI,6), [Math]::Round($lat*180.0/[Math]::PI,6))
}

# ---------- Pastrim emrash bankash -> marka ----------
function Get-Brand($name){
  $n=$name.ToLower()
  if($n -match 'raif'){ return 'Raiffeisen Bank' }
  if($n -match 'procredit|pro credit'){ return 'ProCredit Bank' }
  if($n -match 't\s*e\s*b|teb'){ return 'TEB' }
  if($n -match 'nlb'){ return 'NLB Banka' }
  if($n -match 'bpb|biznes'){ return 'Banka per Biznes (BPB)' }
  if($n -match 'ekonomik'){ return 'Banka Ekonomike' }
  if($n -match 'kombetare|bkt'){ return 'BKT' }
  if($n -match 'ziraat'){ return 'Ziraat Bank' }
  if($n -match 'afk'){ return 'AFK' }
  if($n -match 'kep'){ return 'KEP Trust' }
  if([string]::IsNullOrWhiteSpace($name)){ return 'E panjohur' }
  return $name
}

# ---------- Point-in-polygon (ray casting) ----------
function Point-In-Ring($lon,$lat,$ring){
  $inside=$false; $n=$ring.Count; $j=$n-1
  for($i=0;$i -lt $n;$i++){
    $xi=$ring[$i][0]; $yi=$ring[$i][1]; $xj=$ring[$j][0]; $yj=$ring[$j][1]
    if((($yi -gt $lat) -ne ($yj -gt $lat)) -and ($lon -lt ($xj-$xi)*($lat-$yi)/($yj-$yi)+$xi)){ $inside=-not $inside }
    $j=$i
  }
  return $inside
}

# ============================================================================
Write-Host "1/4 Komunat: lexim + riprojektim 6870 -> 4326 ..."
$komDbf = Read-DBFTable (Join-Path $shp "Shapefile_Komunat\eks-mun-border.dbf")
$komGeom = Read-SHPGeom (Join-Path $shp "Shapefile_Komunat\eks-mun-border.shp")
$komFeatures=@()
$komIndex=@()   # per point-in-polygon: { name, rings(lonlat) }
for($i=0;$i -lt $komGeom.Count;$i++){
  $g=$komGeom[$i]; if($g.type -ne "polygon"){ continue }
  $name=$komDbf[$i].name
  $mpoly=@(); $llrings=@()
  foreach($ring in $g.rings){
    $llring=@()
    foreach($pt in $ring){ $ll=Inv-TM $pt[0] $pt[1]; $llring += ,$ll }
    $mpoly += ,@(,$llring)      # MultiPolygon: cdo pjese = poligon i vecante
    $llrings += ,$llring
  }
  $komFeatures += [pscustomobject]@{ name=$name; coords=$mpoly }
  $komIndex += [pscustomobject]@{ name=$name; rings=$llrings }
}
Write-Host "   -> $($komFeatures.Count) komuna"

function Which-Komuna($lon,$lat){
  foreach($k in $script:komIndex){
    foreach($r in $k.rings){ if(Point-In-Ring $lon $lat $r){ return $k.name } }
  }
  return ''
}

Write-Host "2/4 Bankat: lexim + pastrim emrash + caktim komune ..."
$bDbf=Read-DBFTable (Join-Path $shp "Bankat\Bankat.dbf")
$bGeom=Read-SHPGeom (Join-Path $shp "Bankat\Bankat.shp")
$bankFeat=@()
for($i=0;$i -lt $bGeom.Count;$i++){
  $g=$bGeom[$i]; if($g.type -ne "point"){ continue }
  $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
  $bankFeat += [pscustomobject]@{
    osm_id=$bDbf[$i].osm_id; name=$bDbf[$i].name; banka=(Get-Brand $bDbf[$i].name)
    komuna=(Which-Komuna $lon $lat); lon=$lon; lat=$lat
  }
}
Write-Host "   -> $($bankFeat.Count) banka"

Write-Host "3/4 ATM: lexim + caktim komune ..."
$aDbf=Read-DBFTable (Join-Path $shp "ATM\ATM.dbf")
$aGeom=Read-SHPGeom (Join-Path $shp "ATM\ATM.shp")
$atmFeat=@()
for($i=0;$i -lt $aGeom.Count;$i++){
  $g=$aGeom[$i]; if($g.type -ne "point"){ continue }
  $lon=[Math]::Round($g.x,6); $lat=[Math]::Round($g.y,6)
  $nm=$aDbf[$i].name; if([string]::IsNullOrWhiteSpace($nm)){ $nm='ATM' }
  $atmFeat += [pscustomobject]@{
    osm_id=$aDbf[$i].osm_id; name=$nm; banka=(Get-Brand $aDbf[$i].name)
    komuna=(Which-Komuna $lon $lat); lon=$lon; lat=$lat
  }
}
Write-Host "   -> $($atmFeat.Count) ATM"

# ---------- Shkrim GeoJSON ----------
Write-Host "4/4 Shkrim GeoJSON ne ./data ..."
function JStr($s){ if($null -eq $s){return '""'}; '"'+($s -replace '\\','\\' -replace '"','\"')+'"' }

# Pikat
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

# Komunat (MultiPolygon) + numri i bankave/ATM per komune (per simbolizim/analiza)
$bankByKom=@{}; foreach($f in $bankFeat){ if($f.komuna){ $bankByKom[$f.komuna]=1+([int]$bankByKom[$f.komuna]) } }
$atmByKom=@{};  foreach($f in $atmFeat){  if($f.komuna){ $atmByKom[$f.komuna]=1+([int]$atmByKom[$f.komuna]) } }
$sb=[System.Text.StringBuilder]::new()
[void]$sb.Append('{"type":"FeatureCollection","name":"komunat","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
$first=$true
foreach($k in $komFeatures){
  if(-not $first){ [void]$sb.Append(',') }; $first=$false
  $nb=[int]$bankByKom[$k.name]; $na=[int]$atmByKom[$k.name]
  [void]$sb.Append('{"type":"Feature","properties":{"name":'+(JStr $k.name)+',"banka_count":'+$nb+',"atm_count":'+$na+'},"geometry":{"type":"MultiPolygon","coordinates":[')
  $fp=$true
  foreach($poly in $k.coords){
    if(-not $fp){ [void]$sb.Append(',') }; $fp=$false
    [void]$sb.Append('[')
    $fr=$true
    foreach($ring in $poly){
      if(-not $fr){ [void]$sb.Append(',') }; $fr=$false
      [void]$sb.Append('[')
      $fc=$true
      foreach($c in $ring){
        if(-not $fc){ [void]$sb.Append(',') }; $fc=$false
        [void]$sb.Append('['+$c[0]+','+$c[1]+']')
      }
      [void]$sb.Append(']')
    }
    [void]$sb.Append(']')
  }
  [void]$sb.Append(']}}')
}
[void]$sb.Append(']}')
[System.IO.File]::WriteAllText((Join-Path $out "komunat.geojson"),$sb.ToString(),[System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "PERFUNDOI. Skedaret ne ./data :"
Get-ChildItem $out | ForEach-Object { Write-Host ("   {0,-20} {1,8:N0} bytes" -f $_.Name,$_.Length) }
Write-Host ""
Write-Host "Banka/komune (top 8):"
$bankByKom.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 8 | ForEach-Object { Write-Host ("   {0,-16} {1}" -f $_.Key,$_.Value) }
