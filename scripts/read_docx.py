"""Read and dump all paragraphs from the CHAPTER THREE docx to understand its structure."""
from docx import Document
import sys

doc = Document(r"c:\Projects\eduvid\CHAPTER THREE (Updated).docx")
for i, p in enumerate(doc.paragraphs):
    style = p.style.name if p.style else "None"
    text_preview = p.text[:120] if p.text else ""
    print(f"[{i:03d}] style={style:30s} | {text_preview}")
