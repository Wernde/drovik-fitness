from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageDraw


DEFAULT_SOURCE = Path(
    r"C:\Users\Owner\Downloads\ChatGPT Image Jun 26, 2026, 01_53_36 AM.png"
)
TARGET = Path.cwd() / "public"

ICON_SIZES = {
    "icon-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
}


def marker_pixel(r: int, g: int, b: int) -> bool:
    high = max(r, g, b)
    low = min(r, g, b)
    saturation = high - low

    # Pick up the neon edge, blue rim, and bright metal highlights while
    # ignoring most of the dark gradient background.
    return (
        high >= 190
        or (saturation >= 55 and high >= 115)
        or (r >= 170 and g >= 65 and b <= 95)
        or (b >= 150 and g >= 85 and r <= 125)
    )


def percentile(values: list[int], ratio: float) -> int:
    values.sort()
    index = max(0, min(len(values) - 1, round((len(values) - 1) * ratio)))
    return values[index]


def find_icon_box(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    xs: list[int] = []
    ys: list[int] = []

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a and marker_pixel(r, g, b):
                xs.append(x)
                ys.append(y)

    if not xs:
        return (0, 0, width, height)

    left = percentile(xs, 0.004)
    right = percentile(xs, 0.996)
    top = percentile(ys, 0.004)
    bottom = percentile(ys, 0.996)

    box_width = right - left + 1
    box_height = bottom - top + 1
    side = max(box_width, box_height)
    side = int(side * 1.05)
    side = min(side, width, height)

    center_x = (left + right) // 2
    center_y = (top + bottom) // 2
    crop_left = max(0, min(width - side, center_x - side // 2))
    crop_top = max(0, min(height - side, center_y - side // 2))

    return (crop_left, crop_top, crop_left + side, crop_top + side)


def rounded_alpha(size: int) -> Image.Image:
    scale = 4
    large = size * scale
    inset = round(size * 0.018) * scale
    radius = round(size * 0.145) * scale
    mask = Image.new("L", (large, large), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (inset, inset, large - inset, large - inset),
        radius=radius,
        fill=255,
    )
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def prepare_icon(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    box = find_icon_box(image)
    icon = image.crop(box)
    mask = rounded_alpha(icon.width)
    icon.putalpha(ImageChops.multiply(icon.getchannel("A"), mask))
    return icon


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    icon = prepare_icon(source)
    TARGET.mkdir(parents=True, exist_ok=True)

    for filename, size in ICON_SIZES.items():
        output = icon.resize((size, size), Image.Resampling.LANCZOS)
        output.save(TARGET / filename, optimize=True)
        corner_alpha = output.getpixel((0, 0))[3]
        print(f"{source.name} -> {filename} {size}x{size} corner_alpha={corner_alpha}")


if __name__ == "__main__":
    main()
