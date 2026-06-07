# ============================================================================
#  Klasifikim i bankave ne 3 nenkategori (shton vetine 'kategoria')
#    njohura  = banka komerciale te licensuara
#    pak      = institucione me pak te njohura (mikrofinanca)
#    tjera    = pika me status 'bank' qe NUK jane banke (transfer/kembim/gabim)
#  Lexon/rishkruan data/bankat.geojson (backup .bak2).
#  Vetem ASCII ne skript (shmang problemin e encoding-ut te PowerShell).
# ============================================================================
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$out=Join-Path $root "data"
$fp=Join-Path $out "bankat.geojson"

$j=Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-Kategoria($banka,$name){
  $t=(@($banka,$name) -join ' ').ToLower()
  # 1) banka te njohura (komerciale + bankat serbe me shkronja cirilike)
  if($t -match 'raif|procredit|pro credit|\bteb\b|t e b|\bnlb\b|ekonomik|\bbpb\b|per biznes|p.r biznes|kombetare|komb.tare|\bbkt\b|credins|ziraat|isbank|komercijalna|po.tanska|.tedionica|narodna banka|qendrore|\p{IsCyrillic}'){ return 'njohura' }
  # 2) me pak te njohura (mikrofinanca)
  if($t -match '\bkep\b|\bafk\b|finca|grameen|monego|iute|\bkrk\b'){ return 'pak' }
  # 3) tjera (s'jane banke por kane status bank)
  return 'tjera'
}

function JStr($s){ if($null -eq $s){return '""'}; '"'+($s -replace '\\','\\' -replace '"','\"')+'"' }

Copy-Item $fp ($fp+".bak2") -Force
$sb=[System.Text.StringBuilder]::new()
[void]$sb.Append('{"type":"FeatureCollection","name":"bank","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
$first=$true
$cnt=@{njohura=0;pak=0;tjera=0}
foreach($f in $j.features){
  $p=$f.properties
  $kat=Get-Kategoria $p.banka $p.name
  $cnt[$kat]++
  if(-not $first){ [void]$sb.Append(',') }; $first=$false
  $c=$f.geometry.coordinates
  [void]$sb.Append('{"type":"Feature","properties":{')
  [void]$sb.Append('"osm_id":'+(JStr $p.osm_id)+',"fclass":"bank","name":'+(JStr $p.name)+',"banka":'+(JStr $p.banka)+',"kategoria":'+(JStr $kat)+',"komuna":'+(JStr $p.komuna))
  [void]$sb.Append('},"geometry":{"type":"Point","coordinates":['+$c[0]+','+$c[1]+']}}')
}
[void]$sb.Append(']}')
[System.IO.File]::WriteAllText($fp,$sb.ToString(),[System.Text.UTF8Encoding]::new($false))

Write-Host "PERFUNDOI. Banka sipas kategorise:"
Write-Host ("   Te njohura          : {0}" -f $cnt.njohura)
Write-Host ("   Me pak te njohura   : {0}" -f $cnt.pak)
Write-Host ("   Tjera (status bank) : {0}" -f $cnt.tjera)
Write-Host ("   GJITHSEJ            : {0}" -f ($cnt.njohura+$cnt.pak+$cnt.tjera))
