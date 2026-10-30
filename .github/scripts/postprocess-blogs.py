"""Add author and date metadata to compiled blog pages."""
import sys
from datetime import datetime
from pathlib import Path
import re

for path in (Path(sys.argv[1]) / "blogs").glob("20??/??/*/index.html"):
    match = re.search(r"/(\d{4})/(\d{2})/", path.as_posix())
    if not match:
        continue
    year, month = match.groups()
    label = datetime(int(year), int(month), 1).strftime("%b %Y")
    text = path.read_text(encoding="utf-8")
    meta = f'<p class="article-meta"><span>Yu, Jia-Wei</span><time datetime="{year}-{month}">{label}</time></p>'
    text = text.replace('<div class="typst-document">', '<div class="typst-document">\n      ' + meta, 1)
    style = '<style>.article-meta { display: flex; gap: .65rem; margin: 0 0 1rem; color: var(--md-muted); font: 400 .875rem/1.4 var(--md-font-serif); } .article-meta time { color: inherit; }</style>'
    text = text.replace('</head>', style + '\n</head>', 1)
    path.write_text(text, encoding="utf-8", newline="\n")
