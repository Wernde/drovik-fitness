$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Owner\Desktop\APP\Icons\Logo Icon Thumbnail.png'
$targets = @(
  @{ Path = 'C:\tmp\drovik-app-icon-512.png'; Size = 512 },
  @{ Path = 'C:\tmp\drovik-app-icon-192.png'; Size = 192 },
  @{ Path = 'C:\tmp\drovik-app-icon-180.png'; Size = 180 }
)

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
  foreach ($target in $targets) {
    $targetPath = [string]$target['Path']
    $size = [int]$target['Size']
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
      $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}
