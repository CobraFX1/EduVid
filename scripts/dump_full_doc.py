"""Extract all non-empty paragraphs from the main project docx, grouped by chapter."""
import os
from docx import Document

_dir = r"c:\Projects\eduvid"
_candidates = [f for f in os.listdir(_dir) if f.upper().startswith("DESIGN AND") and f.endswith(".docx")]
if not _candidates:
    raise FileNotFoundError("Could not find the main project docx")
DOC_PATH = os.path.join(_dir, _candidates[0])
print(f"Reading: {_candidates[0]}\n")

doc = Document(DOC_PATH)

current_chapter = "PREAMBLE"
for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if not txt:
        continue
    if txt.startswith("CHAPTER "):
        current_chapter = txt
        print(f"\n{'='*80}")
        print(f"  {txt}")
        print(f"{'='*80}")
        continue
    style = p.style.name if p.style else "None"
    print(f"[{i:03d}|{style:20s}] {txt[:250]}")
