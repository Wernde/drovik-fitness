from pathlib import Path
from PIL import Image


SOURCE = Path(r"C:\Users\Owner\Desktop\APP\Icons")
TARGET = Path.cwd() / "public" / "icons" / "premium"
APP_ICON_SOURCE = SOURCE / "Logo Icon Thumbnail.png"
APP_ICON_TARGET = Path.cwd() / "public"

ICONS = {
    "AI.png": "ai.png",
    "Body Stats.png": "body-stats.png",
    "Calculator.png": "calculator.png",
    "Calendar and History.png": "history.png",
    "Cardio.png": "cardio.png",
    "Date.png": "date.png",
    "Exercise.png": "exercise.png",
    "Home.png": "home.png",
    "Meal.png": "meal.png",
    "Nutrition.png": "nutrition.png",
    "Program.png": "program.png",
    "Progress.png": "progress.png",
    "Settings.png": "settings.png",
    "Water.png": "water.png",
    "Widget plus.png": "plus.png",
    "Workout.png": "workout.png",
}

APP_ICONS = {
    "icon-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
}


def trim_border(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    # The supplied PNGs use a checkerboard preview-style background. Treat
    # near-white/near-grey checker pixels as transparent only when they sit on
    # the connected outside background, preserving silver highlights inside art.
    bg = Image.new("L", rgba.size, 0)
    bg_px = bg.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a == 0:
            return True
        if max(r, g, b) < 215:
            return False
        if max(r, g, b) - min(r, g, b) > 12:
            return False
        return True

    stack = []
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
    max_side = max(cropped.size)
    canvas = Image.new("RGBA", (max_side, max_side), (255, 255, 255, 0))
    canvas.alpha_composite(
        cropped,
        ((max_side - cropped.width) // 2, (max_side - cropped.height) // 2),
    )
    return canvas


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for src_name, out_name in ICONS.items():
        source = SOURCE / src_name
        image = Image.open(source)
        icon = trim_border(image)
        icon.thumbnail((384, 384), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (384, 384), (255, 255, 255, 0))
        canvas.alpha_composite(icon, ((384 - icon.width) // 2, (384 - icon.height) // 2))
        canvas.save(TARGET / out_name, optimize=True)
        print(f"{src_name} -> {out_name} {image.size} {image.mode}")

    app_icon = trim_border(Image.open(APP_ICON_SOURCE))
    APP_ICON_TARGET.mkdir(parents=True, exist_ok=True)
    for out_name, size in APP_ICONS.items():
        icon = app_icon.copy()
        icon.thumbnail((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        canvas.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
        canvas.save(APP_ICON_TARGET / out_name, optimize=True)
        print(f"{APP_ICON_SOURCE.name} -> {out_name} {size}x{size}")


if __name__ == "__main__":
    main()
