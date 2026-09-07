import re, pathlib
h = pathlib.Path("fedpromptly-frontend/index.html").read_text(encoding="utf-8")
blocks = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', h, re.S)
print(f"Found {len(blocks)} inline script blocks")
for i, b in enumerate(blocks):
    body = b.strip()
    if body:
        pathlib.Path(f"outputs/jscheck/block_{i:02d}.js").write_text(body, encoding="utf-8")
        print(f"  block_{i:02d}.js: {len(body)} chars, {body.count(chr(10))+1} lines")
