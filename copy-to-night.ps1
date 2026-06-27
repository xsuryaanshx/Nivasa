$res = "d:\Nivasa\android\app\src\main\res"
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")

foreach ($d in $densities) {
    $nightDir = "$res\mipmap-night-$d"
    if (!(Test-Path $nightDir)) {
        New-Item -ItemType Directory -Path $nightDir | Out-Null
    }
    Copy-Item "$res\mipmap-$d\ic_launcher_background.png" "$nightDir\" -Force
    Copy-Item "$res\mipmap-$d\ic_launcher_foreground.png" "$nightDir\" -Force
    Copy-Item "$res\mipmap-$d\ic_launcher.png" "$nightDir\" -Force
    Copy-Item "$res\mipmap-$d\ic_launcher_round.png" "$nightDir\" -Force
}

$anydpiNight = "$res\mipmap-night-anydpi-v26"
if (!(Test-Path $anydpiNight)) {
    New-Item -ItemType Directory -Path $anydpiNight | Out-Null
}
Copy-Item "$res\mipmap-anydpi-v26\ic_launcher.xml" "$anydpiNight\" -Force
Copy-Item "$res\mipmap-anydpi-v26\ic_launcher_round.xml" "$anydpiNight\" -Force
