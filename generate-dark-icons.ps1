Add-Type -AssemblyName System.Drawing
$publicDir = "d:\Nivasa\public"
$assetsDir = "d:\Nivasa\assets"

$bgSize = 1024
$bg = New-Object System.Drawing.Bitmap($bgSize, $bgSize)
$g = [System.Drawing.Graphics]::FromImage($bg)
$g.Clear([System.Drawing.Color]::FromArgb(255, 9, 9, 11))
$bg.Save("$assetsDir\icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bg.Dispose()

$src = [System.Drawing.Image]::FromFile("$publicDir\logo-dark.png")
$fgSize = 1024
$fg = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
$g2 = [System.Drawing.Graphics]::FromImage($fg)
$g2.Clear([System.Drawing.Color]::Transparent)
$scale = 0.6
$ratio = [Math]::Min(($fgSize * $scale) / $src.Width, ($fgSize * $scale) / $src.Height)
$finalWidth = $src.Width * $ratio
$finalHeight = $src.Height * $ratio
$posX = ($fgSize - $finalWidth) / 2
$posY = ($fgSize - $finalHeight) / 2
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($src, [int]$posX, [int]$posY, [int]$finalWidth, [int]$finalHeight)
$fg.Save("$assetsDir\icon-foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$fg.Dispose()
$src.Dispose()
