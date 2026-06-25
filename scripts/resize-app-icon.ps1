$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Owner\Desktop\APP\Icons\Logo Icon Thumbnail.png'
$targets = @(
  @{ Path = 'C:\Users\Owner\Documents\_GitHub_\drovik-fitness\public\icon-512.png'; Size = 512 },
  @{ Path = 'C:\Users\Owner\Documents\_GitHub_\drovik-fitness\public\icon-192.png'; Size = 192 },
  @{ Path = 'C:\Users\Owner\Documents\_GitHub_\drovik-fitness\public\apple-touch-icon.png'; Size = 180 }
)

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
  foreach ($target in $targets) {
    $size = [int]$target.Size
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $bitmap.SetResolution($sourceImage.HorizontalResolution, $sourceImage.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      $tempPath = "$($target.Path).tmp.png"
      $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Move-Item -LiteralPath $tempPath -Destination ([string]$target.Path) -Force
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}
