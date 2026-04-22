param(
  [string]$OutputDir = "assets\desktop"
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$targetDir = Join-Path $root $OutputDir
[System.IO.Directory]::CreateDirectory($targetDir) | Out-Null

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::Transparent)

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  ([System.Drawing.Point]::new(0, 0)),
  ([System.Drawing.Point]::new($size, $size)),
  ([System.Drawing.ColorTranslator]::FromHtml("#F4E7C7")),
  ([System.Drawing.ColorTranslator]::FromHtml("#C27C4A"))
)
$graphics.FillEllipse($bgBrush, 10, 10, 236, 236)

$framePen = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#6A3D1F")), 8)
$graphics.DrawEllipse($framePen, 10, 10, 236, 236)

$bookBrush = New-Object System.Drawing.SolidBrush(([System.Drawing.ColorTranslator]::FromHtml("#FBF6EA")))
$bookPen = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#6A3D1F")), 5)
$graphics.FillRectangle($bookBrush, 46, 46, 66, 120)
$graphics.FillRectangle($bookBrush, 144, 46, 66, 120)
$graphics.DrawRectangle($bookPen, 46, 46, 66, 120)
$graphics.DrawRectangle($bookPen, 144, 46, 66, 120)

$centerPen = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#9B5C34")), 4)
$graphics.DrawLine($centerPen, 128, 50, 128, 166)

$linePen = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#C6A27A")), 3)
foreach ($y in 72, 92, 112, 132) {
  $graphics.DrawLine($linePen, 56, $y, 102, $y)
  $graphics.DrawLine($linePen, 154, $y, 200, $y)
}

$linkPen = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#2E6E62")), 6)
$linkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$linkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($linkPen, 84, 182, 128, 214)
$graphics.DrawLine($linkPen, 128, 214, 172, 182)
$graphics.DrawLine($linkPen, 128, 214, 128, 164)

$nodeBrush = New-Object System.Drawing.SolidBrush(([System.Drawing.ColorTranslator]::FromHtml("#2E6E62")))
$nodeBorder = New-Object System.Drawing.Pen(([System.Drawing.ColorTranslator]::FromHtml("#F9F2E3")), 4)
foreach ($point in @(@(84, 182), @(128, 214), @(172, 182), @(128, 164))) {
  $graphics.FillEllipse($nodeBrush, $point[0] - 12, $point[1] - 12, 24, 24)
  $graphics.DrawEllipse($nodeBorder, $point[0] - 12, $point[1] - 12, 24, 24)
}

$font = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush(([System.Drawing.ColorTranslator]::FromHtml("#6A3D1F")))
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString("JF", $font, $textBrush, ([System.Drawing.RectangleF]::new(0, 208, 256, 36)), $stringFormat)

$pngPath = Join-Path $targetDir "icon.png"
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$iconPath = Join-Path $targetDir "icon.ico"
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create($iconPath)
$icon.Save($stream)
$stream.Dispose()

$icon.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$bgBrush.Dispose()
$framePen.Dispose()
$bookBrush.Dispose()
$bookPen.Dispose()
$centerPen.Dispose()
$linePen.Dispose()
$linkPen.Dispose()
$nodeBrush.Dispose()
$nodeBorder.Dispose()
$font.Dispose()
$textBrush.Dispose()
$stringFormat.Dispose()

Write-Output "Generated icon assets:"
Write-Output $pngPath
Write-Output $iconPath
