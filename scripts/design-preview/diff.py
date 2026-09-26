# משווה שתי תיקיות צילומים ומדווח כמה פיקסלים השתנו בכל מסך (+ תמונת הבדלים).
# python3 scripts/design-preview/diff.py <before> <after> <out>
import sys, os
from PIL import Image, ImageChops

before, after, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
changed = 0
for name in sorted(os.listdir(before)):
    a_path, b_path = os.path.join(before, name), os.path.join(after, name)
    if not os.path.exists(b_path):
        print(f"MISSING  {name}"); changed += 1; continue
    a, b = Image.open(a_path).convert("RGB"), Image.open(b_path).convert("RGB")
    if a.size != b.size:
        print(f"SIZE     {name}: {a.size} -> {b.size}"); changed += 1
        h = max(a.height, b.height)
        pa, pb = Image.new("RGB", (a.width, h), "white"), Image.new("RGB", (b.width, h), "white")
        pa.paste(a); pb.paste(b); a, b = pa, pb
    diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 16 else 0)
    n = diff.histogram()[255]
    if n:
        changed += 1
        pct = 100 * n / (a.width * a.height)
        print(f"CHANGED  {name}: {n} px ({pct:.3f}%) bbox={diff.getbbox()}")
        side = Image.new("RGB", (a.width * 3, a.height), "white")
        side.paste(a, (0, 0)); side.paste(b, (a.width, 0))
        red = Image.new("RGB", a.size, (255, 0, 0))
        side.paste(Image.composite(red, b, diff), (a.width * 2, 0))
        side.save(os.path.join(out, name))
    else:
        print(f"same     {name}")
print(f"\n{changed} changed")
