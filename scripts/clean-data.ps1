# ============================================================================
#  Pastrim i te dhenave (faza e dyte):
#   BANKAT: hiq mikrofinancat (pak) + emrat garbage; mbaj vetem
#           njohura + tjera (transfer/kembim legjitime). Rregullo typo Raiffeisen.
#   ATM:    normalizo marken; pastro emrat bullshit (dritoni, daja aziz, work...)
#           -> "ATM" ose "ATM - <banke e njohur>".
#  Backup .bak3. Vetem ASCII ne skript.
# ============================================================================
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$out=Join-Path $root "data"
$encOut=[System.Text.UTF8Encoding]::new($false)

$reKnown='raif|raffeisen|raifeisen|riffesen|reiffe|reifei|reifeissen|procredit|pro credit|\bteb\b|t e b|\bnlb\b|ekonomik|\bbpb\b|per biznes|p.r biznes|kombetare|komb.tare|\bbkt\b|credins|ziraat|isbank|komercijalna|po.tanska|.tedionica|narodna banka|qendrore|\p{IsCyrillic}'
$reTransfer='western union|union net|union western|unionnet|money\s?gram|moneygram|moneta|\bria\b|capital|vllesa|ecodex|kembim|kembimore|euro.kembim|\bibas\b'

function Get-Brand($t){
  if($t -match 'raif|raffeisen|raifeisen|riffesen|reiffe|reifei|reifeissen'){ return 'Raiffeisen Bank' }
  if($t -match 'procredit|pro credit'){ return 'ProCredit Bank' }
  if($t -match '\bteb\b|t e b'){ return 'TEB' }
  if($t -match '\bnlb\b'){ return 'NLB Banka' }
  if($t -match '\bbpb\b|per biznes|p.r biznes'){ return 'Banka per Biznes (BPB)' }
  if($t -match 'ekonomik'){ return 'Banka Ekonomike' }
  if($t -match 'kombetare|komb.tare|\bbkt\b'){ return 'BKT' }
  if($t -match 'credins'){ return 'Credins Bank' }
  if($t -match 'ziraat'){ return 'Ziraat Bank' }
  if($t -match 'isbank'){ return 'Isbank' }
  if($t -match 'komercijalna'){ return 'Komercijalna Banka' }
  if($t -match 'po.tanska|.tedionica|\p{IsCyrillic}'){ return 'Postanska Stedionica' }
  if($t -match 'narodna banka'){ return 'Narodna Banka' }
  if($t -match 'qendrore'){ return 'Banka Qendrore' }
  return 'E panjohur'
}
function Get-TransferBrand($t){
  if($t -match 'western union|union net|union western|unionnet'){ return 'Western Union' }
  if($t -match 'money\s?gram|moneygram|moneta'){ return 'MoneyGram' }
  if($t -match '\bria\b|capital|vllesa|ecodex'){ return 'Ria / Capital' }
  if($t -match 'kembim|kembimore|euro.kembim'){ return 'Kembimore' }
  if($t -match '\bibas\b'){ return 'Transfer' }
  return 'Transfer / Kembim'
}
function JStr($s){ if($null -eq $s){return '""'}; '"'+($s -replace '\\','\\' -replace '"','\"')+'"' }

# ---------------- BANKAT ----------------
$fp=Join-Path $out "bankat.geojson"
$j=Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json
Copy-Item $fp ($fp+".bak3") -Force
$sb=[System.Text.StringBuilder]::new()
[void]$sb.Append('{"type":"FeatureCollection","name":"bank","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
$first=$true; $cN=0;$cT=0;$cDrop=0
foreach($f in $j.features){
  $p=$f.properties; $t=(@($p.banka,$p.name) -join ' ').ToLower()
  if($t -match $reKnown){ $kat='njohura'; $banka=(Get-Brand $t); $cN++ }
  elseif($t -match $reTransfer){ $kat='tjera'; $banka=(Get-TransferBrand $t); $cT++ }
  else { $cDrop++; continue }   # mikrofinanca + garbage -> hiqet
  if(-not $first){ [void]$sb.Append(',') }; $first=$false
  $c=$f.geometry.coordinates
  $nm=$p.name; if($kat -eq 'tjera' -or [string]::IsNullOrWhiteSpace($nm)){ $nm=$banka }
  [void]$sb.Append('{"type":"Feature","properties":{')
  [void]$sb.Append('"osm_id":'+(JStr $p.osm_id)+',"fclass":"bank","name":'+(JStr $nm)+',"banka":'+(JStr $banka)+',"kategoria":'+(JStr $kat)+',"komuna":'+(JStr $p.komuna))
  [void]$sb.Append('},"geometry":{"type":"Point","coordinates":['+$c[0]+','+$c[1]+']}}')
}
[void]$sb.Append(']}')
[System.IO.File]::WriteAllText($fp,$sb.ToString(),$encOut)
Write-Host ("BANKAT -> njohura={0}, tjera={1}, u hoqen={2}" -f $cN,$cT,$cDrop)

# ---------------- ATM ----------------
$fp=Join-Path $out "atm.geojson"
$j=Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json
Copy-Item $fp ($fp+".bak3") -Force
$sb=[System.Text.StringBuilder]::new()
[void]$sb.Append('{"type":"FeatureCollection","name":"atm","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
$first=$true; $cleaned=0
foreach($f in $j.features){
  $p=$f.properties; $t=(@($p.name,$p.banka) -join ' ').ToLower()
  $brand=Get-Brand $t
  $nm = if($brand -ne 'E panjohur'){ "ATM - $brand" } else { 'ATM' }
  if($nm -eq 'ATM' -and ($p.name -ne 'ATM')){ $cleaned++ }
  if(-not $first){ [void]$sb.Append(',') }; $first=$false
  $c=$f.geometry.coordinates
  [void]$sb.Append('{"type":"Feature","properties":{')
  [void]$sb.Append('"osm_id":'+(JStr $p.osm_id)+',"fclass":"atm","name":'+(JStr $nm)+',"banka":'+(JStr $brand)+',"komuna":'+(JStr $p.komuna))
  [void]$sb.Append('},"geometry":{"type":"Point","coordinates":['+$c[0]+','+$c[1]+']}}')
}
[void]$sb.Append(']}')
[System.IO.File]::WriteAllText($fp,$sb.ToString(),$encOut)
Write-Host ("ATM -> $($j.features.Count) pika, u pastruan emra junk={0}" -f $cleaned)
Write-Host "PERFUNDOI."
