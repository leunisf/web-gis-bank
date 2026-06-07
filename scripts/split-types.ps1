# ============================================================================
#  Ndan bankat ne 2 lloje te ndara:
#    bankat.geojson    -> vetem banka reale (kategoria 'njohura'), fclass=bank
#    transferet.geojson-> Western Union/Ria/kembimore etj. (kategoria 'tjera'),
#                          fclass=transfer  (NUK jane banka)
#  Heq vetine 'kategoria'. Backup .bak4. Vetem ASCII.
# ============================================================================
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$out=Join-Path $root "data"
$encOut=[System.Text.UTF8Encoding]::new($false)
function JStr($s){ if($null -eq $s){return '""'}; '"'+($s -replace '\\','\\' -replace '"','\"')+'"' }
function Write-Points($features,$fclass,$file){
  $sb=[System.Text.StringBuilder]::new()
  [void]$sb.Append('{"type":"FeatureCollection","name":"'+$fclass+'","crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}},"features":[')
  $first=$true
  foreach($f in $features){
    if(-not $first){ [void]$sb.Append(',') }; $first=$false
    $p=$f.properties; $c=$f.geometry.coordinates
    [void]$sb.Append('{"type":"Feature","properties":{')
    [void]$sb.Append('"osm_id":'+(JStr $p.osm_id)+',"fclass":'+(JStr $fclass)+',"name":'+(JStr $p.name)+',"banka":'+(JStr $p.banka)+',"komuna":'+(JStr $p.komuna))
    [void]$sb.Append('},"geometry":{"type":"Point","coordinates":['+$c[0]+','+$c[1]+']}}')
  }
  [void]$sb.Append(']}')
  [System.IO.File]::WriteAllText($file,$sb.ToString(),$encOut)
}

$fp=Join-Path $out "bankat.geojson"
$j=Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json
Copy-Item $fp ($fp+".bak4") -Force
$banks=@(); $transfers=@()
foreach($f in $j.features){
  if($f.properties.kategoria -eq 'njohura'){ $banks+=$f } else { $transfers+=$f }
}
Write-Points $banks "bank" (Join-Path $out "bankat.geojson")
Write-Points $transfers "transfer" (Join-Path $out "transferet.geojson")
Write-Host ("PERFUNDOI. banka={0}, transfere={1}" -f $banks.Count,$transfers.Count)
