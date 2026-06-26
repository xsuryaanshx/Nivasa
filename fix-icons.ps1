Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\Nivasa\assets"
$publicDir = "d:\Nivasa\public"

# 1. Create Backgrounds
$bgSize = 1024
$bg = New-Object System.Drawing.Bitmap($bgSize, $bgSize)
$g = [System.Drawing.Graphics]::FromImage($bg)

# Light background (White)
$g.Clear([System.Drawing.Color]::White)
$bg.Save("$assetsDir\icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Dark background (almost black)
$g.Clear([System.Drawing.Color]::FromArgb(255, 9, 9, 11))
$bg.Save("$assetsDir\icon-background-dark.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bg.Dispose()

# 2. Create padded foregrounds
function Create-PaddedForeground($sourceFile, $targetFile) {
    $src = [System.Drawing.Image]::FromFile($sourceFile)
    
    $fgSize = 1024
    $fg = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $g2 = [System.Drawing.Graphics]::FromImage($fg)
    
    # Make transparent background
    $g2.Clear([System.Drawing.Color]::Transparent)
    
    # We want the logo to take up about 60% of the space to give it safe zone padding
    $scale = 0.6
    $targetWidth = $fgSize * $scale
    $targetHeight = $fgSize * $scale
    
    # Maintain aspect ratio
    $ratioX = $targetWidth / $src.Width
    $ratioY = $targetHeight / $src.Height
    $ratio = [Math]::Min($ratioX, $ratioY)
    
    $finalWidth = $src.Width * $ratio
    $finalHeight = $src.Height * $ratio
    
    $posX = ($fgSize - $finalWidth) / 2
    $posY = ($fgSize - $finalHeight) / 2
    
    # Draw high quality
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.DrawImage($src, [int]$posX, [int]$posY, [int]$finalWidth, [int]$finalHeight)
    
    $fg.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g2.Dispose()
    $fg.Dispose()
    $src.Dispose()
}

Create-PaddedForeground "$publicDir\logo.png" "$assetsDir\icon-foreground.png"
Create-PaddedForeground "$publicDir\logo-dark.png" "$assetsDir\icon-foreground-dark.png"

Write-Host "Icons padded and backgrounds generated!"
