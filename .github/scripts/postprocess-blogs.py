import sys
from datetime import datetime
from pathlib import Path
import re
for path in (Path(sys.argv[1]) / "blogs").glob("20??/??/*/index.html"):
    match = re.search(r"/(\d{4})/(\d{2})/", path.as_posix())
    if not match: continue
    year, month = match.groups()
    label = datetime(int(year), int(month), 1).strftime("%b %Y")
    text = path.read_text(encoding="utf-8")
    meta = f'<p class="article-meta"><span>Yu, Jia-Wei</span><time datetime="{year}-{month}">{label}</time></p>'
    if 'class="article-meta"' in text:
        text = re.sub(r'<p class="article-meta">.*?</p>', meta, text, count=1)
    else:
        text = text.replace('<div class="typst-document">', '<div class="typst-document">\n      ' + meta, 1)
    text = re.sub(r"(?m)^\s*\.article-meta(?: time)? \{[^\n]*\}\n?", "", text)
    text = re.sub(r"(?s)\s*/\* PELE MERMAID CSS START \*/.*?/\* PELE MERMAID CSS END \*/\s*", "\n", text)
    text = re.sub(r"(?s)<!-- PELE MERMAID START -->.*?<!-- PELE MERMAID END -->\s*", "", text)
    mermaid = 'data-lang="mermaid"' in text
    rules = [".article-meta { display: flex; gap: .65rem; margin: 0 0 1rem; color: var(--md-muted); font: 400 .875rem/1.4 var(--md-font-serif); }", ".article-meta time { color: inherit; }"]
    if mermaid:
        rules += ["/* PELE MERMAID CSS START */", ".typst-document pre.mermaid { --pele-bg: transparent; --pele-fg: var(--md-fg); --pele-muted: var(--md-muted); --pele-line: var(--md-fg); --pele-surface: var(--md-pre-bg); --pele-surface-alt: var(--md-border-muted); --pele-border: var(--md-border); --pele-accent: var(--md-accent); --pele-font: var(--md-font-serif); --pele-font-mono: var(--md-font-mono); margin: 1rem 0; padding: 0; overflow: visible; color: var(--md-fg); background: transparent; border: 0; }", ".typst-document pre.mermaid > svg { display: block; max-width: 100%; }", "/* PELE MERMAID CSS END */"]
    text = text.replace("</style>", "\n      " + "\n      ".join(rules) + "\n    </style>", 1)
    if mermaid:
        js = '<script src="/assets/pele.global.js"></script>\n<script>(() => { if (!window.pele) return; document.querySelectorAll(\'pre > code[data-lang="mermaid"]\').forEach(code => { const el = code.parentElement; el.classList.add("mermaid"); window.pele.mount(el, code.textContent, { fontSize: 14 }); }); })();</script>\n'
        text = text.replace("</body>", js + "</body>", 1)
    path.write_text(text, encoding="utf-8", newline="\n")
