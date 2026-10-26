from datetime import datetime
from pathlib import Path
import re


root = Path(__file__).resolve().parent
pele_version = "1.6.0"
for html_path in root.glob("20??/??/*/index.html"):
    match = re.search(r"/(\d{4})/(\d{2})/", html_path.as_posix())
    if not match:
        continue

    year, month = match.groups()
    article_date = datetime(int(year), int(month), 1)
    label = article_date.strftime("%b %Y")
    content = html_path.read_text(encoding="utf-8")

    if 'class="article-meta"' in content:
        content = re.sub(
            r'<p class="article-meta">.*?</p>',
            f'<p class="article-meta"><span>Yu, Jia-Wei</span><time datetime="{year}-{month}">{label}</time></p>',
            content,
            count=1,
        )
    else:
        content = content.replace(
            '<div class="typst-document">',
            '<div class="typst-document">\n'
            f'      <p class="article-meta"><span>Yu, Jia-Wei</span><time datetime="{year}-{month}">{label}</time></p>',
            1,
        )

    content = re.sub(r"(?m)^\s*\.article-meta(?: time)? \{[^\n]*\}\n?", "", content)
    content = re.sub(
        r"(?s)\s*/\* PELE MERMAID CSS START \*/.*?/\* PELE MERMAID CSS END \*/\s*",
        "\n",
        content,
    )
    content = re.sub(
        r"(?s)<!-- PELE MERMAID START -->.*?<!-- PELE MERMAID END -->\s*",
        "",
        content,
    )

    style_rules = [
        ".article-meta { display: flex; gap: .65rem; margin: 0 0 1rem; color: var(--md-muted); font: 400 .875rem/1.4 var(--md-font-serif); }",
        ".article-meta time { color: inherit; }",
    ]
    has_mermaid = 'data-lang="mermaid"' in content
    if has_mermaid:
        style_rules.extend([
            "/* PELE MERMAID CSS START */",
            ".typst-document pre.mermaid { --pele-bg: transparent; --pele-fg: var(--md-fg); --pele-muted: var(--md-muted); --pele-line: var(--md-fg); --pele-surface: var(--md-pre-bg); --pele-surface-alt: var(--md-border-muted); --pele-border: var(--md-border); --pele-accent: var(--md-accent); --pele-font: var(--md-font-serif); --pele-font-mono: var(--md-font-mono); margin: 1rem 0; padding: 0; overflow: visible; color: var(--md-fg); background: transparent; border: 0; }",
            ".typst-document pre.mermaid > svg { display: block; max-width: 100%; }",
            "/* PELE MERMAID CSS END */",
        ])
    style_block = "\n      " + "\n      ".join(style_rules) + "\n"
    content = content.replace("</style>", style_block + "    </style>", 1)

    if has_mermaid:
        pele_scripts = (
            '<!-- PELE MERMAID START -->\n'
            f'<script src="https://cdn.jsdelivr.net/npm/pele@{pele_version}/dist/pele.global.js"></script>\n'
            "<script>\n"
            "(() => {\n"
            '  if (!window.pele) return;\n'
            '  document.querySelectorAll(\'pre > code[data-lang="mermaid"]\').forEach(code => {\n'
            "    const container = code.parentElement;\n"
            "    container.classList.add('mermaid');\n"
            "    window.pele.mount(container, code.textContent, { fontSize: 14 });\n"
            "  });\n"
            "})();\n"
            "</script>\n"
            "<!-- PELE MERMAID END -->\n"
        )
        content = content.replace("</body>", pele_scripts + "</body>", 1)
    html_path.write_text(content, encoding="utf-8", newline="\n")
