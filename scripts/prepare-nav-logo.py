from pathlib import Path
import sys

from PIL import Image


DEFAULT_SOURCE = Path(
    r"C:\Users\Owner\Downloads\ChatGPT Image Jun 26, 2026, 01_55_21 AM.png"
)
TARGET = Path.cwd() / "public" / "drovik-logo-gold.png"
MAX_WIDTH = 760


def trim_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    # The supplied artwork has a checkerboard preview-style background. Remove
    # only the connected light neutral background so the metal, neon, and glow
    # in the logo itself are preserved.
    bg = Image.new("L", rgba.size, 0)
    bg_px = bg.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a == 0:
            return True
        high = max(r, g, b)
        low = min(r, g, b)
        avg = (r + g + b) / 3
        return avg >= 214 and high - low <= 18

    stack: list[tuple[int, int]] = []
    for x in range(width):
        if is_bg(x, 0):
            stack.append((x, 0))
        if is_bg(x, height - 1):
            stack.append((x, height - 1))
    for y in range(height):
        if is_bg(0, y):
            stack.append((0, y))
        if is_bg(width - 1, y):
            stack.append((width - 1, y))

    while stack:
        x, y = stack.pop()
        if bg_px[x, y] == 255 or not is_bg(x, y):
            continue
        bg_px[x, y] = 255
        if x > 0:
            stack.append((x - 1, y))
        if x < width - 1:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y < height - 1:
            stack.append((x, y + 1))

    alpha = rgba.getchannel("A")
    alpha_px = alpha.load()
    for y in range(height):
        for x in range(width):
            if bg_px[x, y] == 255:
                alpha_px[x, y] = 0
    rgba.putalpha(alpha)

    box = rgba.getbbox()
    if not box:
        return rgba

    cropped = rgba.crop(box)
    pad = max(8, round(max(cropped.size) * 0.015))
    canvas = Image.new(
        "RGBA",
        (cropped.width + pad * 2, cropped.height + pad * 2),
        (255, 255, 255, 0),
    )
    canvas.alpha_composite(cropped, (pad, pad))
    return canvas


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    logo = trim_background(Image.open(source))
    if logo.width > MAX_WIDTH:
        next_height = round(logo.height * MAX_WIDTH / logo.width)
        logo = logo.resize((MAX_WIDTH, next_height), Image.Resampling.LANCZOS)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    logo.save(TARGET, optimize=True)
    print(
        f"{source.name} -> {TARGET.name} {logo.width}x{logo.height} "
        f"corner_alpha={logo.getpixel((0, 0))[3]}"
    )


if __name__ == "__main__":
    main()
