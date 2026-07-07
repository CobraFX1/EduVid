"""Dump all paragraphs from the main project docx to find chapter 3 and 4 boundaries."""
from docx import Document

DOC_PATH = r"c:\Projects\eduvid\DESIGN AND IMPLEMENTATION OF A WEB – BASED EDUCATIONAL VIDEO PLATFORM FOR PEER-TO-PEER LEARNING.docx"
doc = Document(DOC_PATH)

for i, p in enumerate(doc.paragraphs):
    style = p.style.name if p.style else "None"
    text_preview = p.text[:150] if p.text else ""
    if text_preview.strip():  # Only show non-empty
        print(f"[{i:03d}] style={style:30s} | {text_preview}")
