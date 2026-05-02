from PIL import Image, ImageDraw, ImageFont
import os

OUT = "C:/dev/git/ai-projects/boligscore-v1/public/icons"
os.makedirs(OUT, exist_ok=True)

PRIMARY = (79, 108, 69)        # #4f6c45 — Stitch primary green
PRIMARY_DIM = (67, 96, 58)     # #43603a — slightly darker for gradient bottom
ON_PRIMARY = (255, 255, 255)
PRIMARY_CONTAINER = (202, 236, 188)  # #caecbc

def make_icon(size: int, path: str):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Solid rounded-square primary fill (~24% radius — matches the
    # design-token rounded-2xl on a 192/512 canvas).
    radius = int(size * 0.24)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=PRIMARY)

    # Subtle inner shadow ring for depth.
    inner_pad = int(size * 0.06)
    d.rounded_rectangle(
        (inner_pad, inner_pad, size - 1 - inner_pad, size - 1 - inner_pad),
        radius=radius - inner_pad,
        outline=PRIMARY_DIM,
        width=max(1, size // 192),
    )

    # "B" glyph centered. Use a system font; fallback to default if not found.
    text = "B"
    font_size = int(size * 0.55)
    font = None
    for fp in (
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ):
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Center the glyph.
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - int(size * 0.02)
    d.text((x, y), text, font=font, fill=ON_PRIMARY)

    img.save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")

make_icon(192, os.path.join(OUT, "icon-192.png"))
make_icon(512, os.path.join(OUT, "icon-512.png"))
# Also generate a maskable version (with safe-zone padding) — nice-to-have.
make_icon(512, os.path.join(OUT, "icon-maskable-512.png"))
