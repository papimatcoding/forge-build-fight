#!/usr/bin/env python3
"""One-time import of signed portrait previews provided by Canva.

These previews are lower-resolution (381x524 at retrieval) than an original
high-resolution Canva export. We preserve the image and create display assets
with proper fallback. This script intentionally refuses expired URLs and never
substitutes blank images.
"""
from pathlib import Path
from io import BytesIO
import json
import urllib.request
from PIL import Image, ImageOps

root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/"scripts/canva_preview_sources.json").read_text(encoding="utf-8"))
pages=manifest["pages"]
assert len(pages)==16, "Expected exactly 16 Canva pages"
out=root/"assets"/"cards"
out.mkdir(parents=True, exist_ok=True)
for page in pages:
    url=page["url"]
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (Barbaridades-Canva-Importer)"})
    try:
        with urllib.request.urlopen(req,timeout=30) as response:
            data=response.read(6*1024*1024)
            assert response.status==200, (page["id"],response.status)
            assert len(data)>5000, "Suspiciously small download"
    except Exception as exc:
        raise RuntimeError("Cannot fetch Canva image "+page["id"]+": "+str(exc)) from exc
    original=Image.open(BytesIO(data)).convert("RGB")
    assert original.width>=250 and original.height>=350,(page["id"],original.size)
    # Full Canva page has a centered trading card and large surrounding margins.
    # The illustration sits inside that trading card; extract it to avoid duplicating
    # Canva-generated (occasionally inaccurate) cost/effect text over HTML values.
    full=ImageOps.fit(original,(512,704),method=Image.Resampling.LANCZOS)
    full.save(out/(page["id"]+"-full.png"),format="PNG",optimize=True)
    # Ratios were visually verified on the 16-page portrait card template.
    art=full.crop((int(512*.254),int(704*.289),int(512*.728),int(704*.615)))
    art=ImageOps.fit(art,(512,512),method=Image.Resampling.LANCZOS)
    art.save(out/(page["id"]+".png"),format="PNG",optimize=True)
    art.resize((256,256),Image.Resampling.LANCZOS).save(out/(page["id"]+"-256.png"),format="PNG",optimize=True)
    print(f'{page["index"]:02d}/16 {page["id"]} source={original.size} artwork={art.size}')
assert len(list(out.glob("*.png")))==48, "Missing PNG assets"
