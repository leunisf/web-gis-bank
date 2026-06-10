# Ndertimi i nje skedari Word .doc te vetemjaftueshem nga docs/dokumentimi.html
# Imazhet zvogelohen (max width 850px, JPEG) dhe ngulet si data-URI base64.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root "docs\dokumentimi.html"
$imgDir   = Join-Path $root "docs\img"
$outDoc   = Join-Path $root "Dokumentimi.doc"

# JPEG encoder me cilesi
$jpgEnc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]82)

function Get-DataUri($file, $maxW = 850) {
  $img = [System.Drawing.Image]::FromFile($file)
  try {
    $w = $img.Width; $h = $img.Height
    if ($w -gt $maxW) { $h = [int]($h * $maxW / $w); $w = $maxW }
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, $jpgEnc, $ep)
    $bmp.Dispose()
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose()
    return "data:image/jpeg;base64,$b64"
  } finally { $img.Dispose() }
}

$html = Get-Content $htmlPath -Raw -Encoding UTF8
# Gjej te gjitha src="img/...."
$matches = [regex]::Matches($html, 'src="img/([^"]+)"')
$done = @{}
foreach ($m in $matches) {
  $name = $m.Groups[1].Value
  if ($done.ContainsKey($name)) { continue }
  $f = Join-Path $imgDir $name
  if (Test-Path $f) {
    Write-Host "  ngul: $name"
    $uri = Get-DataUri $f
    $html = $html.Replace('src="img/' + $name + '"', 'src="' + $uri + '"')
    $done[$name] = $true
  } else { Write-Host "  MUNGON: $name" }
}

# Shkruaj si .doc (HTML qe Word e hap nativisht), UTF-8 me BOM
[System.IO.File]::WriteAllText($outDoc, $html, (New-Object System.Text.UTF8Encoding($true)))
Write-Host ("PERFUNDOI -> {0}  ({1:N0} bytes)" -f $outDoc, (Get-Item $outDoc).Length)
