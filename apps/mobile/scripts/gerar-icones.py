# Gera os ícones do app a partir da logo original (precisa do Pillow: pip install pillow).
# Uso, de apps/mobile/assets: python3 ../scripts/gerar-icones.py logo-original.png .
# Depois refaça o splash-icon.png (quadrado branco arredondado com o símbolo; ver o commit da logo).
import sys
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = im.size
px = im.load()

def to_rgba(keep):
    """Fundo branco -> transparente, com anti-aliasing (desfaz a mistura com o branco)."""
    o = Image.new("RGBA", im.size, (0, 0, 0, 0))
    op = o.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            m = min(r, g, b)
            # quão "não branco" é o pixel (fundo ~ 245-255)
            a = max(0.0, min(1.0, (240 - m) / 140))
            if a <= 0 or not keep(r, g, b):
                continue
            # desmistura do branco
            cr = (r - (1 - a) * 255) / a
            cg = (g - (1 - a) * 255) / a
            cb = (b - (1 - a) * 255) / a
            op[x, y] = (max(0, min(255, round(cr))), max(0, min(255, round(cg))), max(0, min(255, round(cb))), round(a * 255))
    return o

def trim(img, pad=0):
    bbox = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    img = img.crop(bbox)
    if pad:
        c = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
        c.paste(img, (pad, pad))
        img = c
    return img

# Ignora a sujeira no canto inferior direito.
def inside(x, y): return x < W - 30 or y < H - 30

full = to_rgba(lambda r, g, b: True)
fp = full.load()
for y in range(H - 30, H):
    for x in range(W - 30, W):
        fp[x, y] = (0, 0, 0, 0)
full = trim(full)
full.save(f"{out}/logo.png")

# Símbolo: só os tons quentes (laranja e amarelo); o texto é azul-marinho.
sym = to_rgba(lambda r, g, b: r > b + 60)
sp = sym.load()
for y in range(H - 30, H):
    for x in range(W - 30, W):
        sp[x, y] = (0, 0, 0, 0)
sym = trim(sym)
sym.save(f"{out}/logo-symbol.png")

def square(img, size, frac, bg):
    canvas = Image.new("RGBA", (size, size), bg)
    scale = frac * size / max(img.width, img.height)
    s = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return canvas

WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
square(sym, 1024, 0.78, WHITE).convert("RGB").save(f"{out}/icon.png")
# Ícone adaptativo: o sistema corta até ~66% do centro; o símbolo fica dentro dessa área.
square(sym, 1024, 0.62, CLEAR).save(f"{out}/android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), WHITE).save(f"{out}/android-icon-background.png")
mono = square(sym, 1024, 0.62, CLEAR)
mono_px = [(255, 255, 255, a) for (_, _, _, a) in mono.get_flattened_data()]
mono.putdata(mono_px)
mono.save(f"{out}/android-icon-monochrome.png")
# Splash nativa: logo completa (fundo branco no app.json).
square(full, 1024, 0.9, CLEAR).save(f"{out}/splash-icon.png")
square(sym, 48, 0.9, WHITE).convert("RGB").save(f"{out}/favicon.png")
print("ok", full.size, sym.size)
