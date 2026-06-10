# Vizaton nje diagram te thjeshte te arkitektures 3-nivelshe -> docs/img/arkitektura.png
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root "docs\img\arkitektura.png"

$W = 1040; $H = 430
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Bold)
$hdrFont   = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$bodyFont  = New-Object System.Drawing.Font("Segoe UI", 11)
$tierFont  = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Italic)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center

$black = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26,26,26))
$gray  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90,100,120))
$white = [System.Drawing.Brushes]::White

# Titulli
$g.DrawString("Arkitektura e aplikacionit WebGIS", $titleFont, $black, (New-Object System.Drawing.RectangleF(0,12,$W,34)), $sf)

# Kutite: x, ngjyra header, ngjyra body, titull, trup, tier
$boxes = @(
  @{ x=40;  hc=[System.Drawing.Color]::FromArgb(29,78,216);  bc=[System.Drawing.Color]::FromArgb(219,234,254); t="TE DHENAT"; b="GeoJSON  -  Shapefile`nSupabase / PostGIS`n(banka, ATM, transfere, komunat)"; tier="Niveli i te dhenave" },
  @{ x=390; hc=[System.Drawing.Color]::FromArgb(5,150,105);   bc=[System.Drawing.Color]::FromArgb(209,250,229); t="SERVERI"; b="GeoServer  ->  WMS / WFS`nGitHub Pages (hosting)`nSupabase REST-API"; tier="Niveli logjik (server)" },
  @{ x=740; hc=[System.Drawing.Color]::FromArgb(217,119,6);   bc=[System.Drawing.Color]::FromArgb(254,243,199); t="PERDORUESI"; b="Shfletuesi: Leaflet`nHTML / CSS / JavaScript`nKompjuter & Mobil"; tier="Niveli prezantues" }
)
$bw = 260; $by = 90; $bh = 175; $hh = 42

foreach ($bx in $boxes) {
  $x = $bx.x
  # trupi
  $bodyBrush = New-Object System.Drawing.SolidBrush($bx.bc)
  $g.FillRectangle($bodyBrush, $x, $by, $bw, $bh)
  # header
  $hdrBrush = New-Object System.Drawing.SolidBrush($bx.hc)
  $g.FillRectangle($hdrBrush, $x, $by, $bw, $hh)
  # kornize
  $pen = New-Object System.Drawing.Pen($bx.hc, 2)
  $g.DrawRectangle($pen, $x, $by, $bw, $bh)
  # tekstet
  $g.DrawString($bx.t, $hdrFont, $white, (New-Object System.Drawing.RectangleF($x, $by, $bw, $hh)), $sf)
  $g.DrawString($bx.b, $bodyFont, $black, (New-Object System.Drawing.RectangleF($x, ($by+$hh), $bw, ($bh-$hh))), $sf)
  $g.DrawString($bx.tier, $tierFont, $gray, (New-Object System.Drawing.RectangleF($x, ($by+$bh+8), $bw, 22)), $sf)
}

# Shigjetat midis kutive
$arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60,60,60), 3)
$arrowPen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(6,6)
$ymid = $by + [int]($bh/2)
$g.DrawLine($arrowPen, (40+$bw+6), $ymid, (390-6), $ymid)
$g.DrawLine($arrowPen, (390+$bw+6), $ymid, (740-6), $ymid)

# Teksti poshte
$g.DrawString("HTTP request  <=>  HTTP response   (URL / HTTP / HTML / JSON)", $tierFont, $gray, (New-Object System.Drawing.RectangleF(0,($by+$bh+38),$W,24)), $sf)

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host ("OK -> {0}  ({1:N0} bytes)" -f $out, (Get-Item $out).Length)
