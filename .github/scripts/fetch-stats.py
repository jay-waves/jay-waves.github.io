#!/usr/bin/env python3
"""Download and style the profile SVGs used by the site."""
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

FONT = "Georgia, 'Times New Roman', 'Noto Serif', 'Noto Serif CJK SC', 'Noto Serif SC', serif"
URLS = (
    ("top-langs.svg", os.environ.get("LANGUAGE_CARD_URL", "https://github-stats-extended.vercel.app/api/top-langs?username=jay-waves&layout=compact&card_width=360&hide_title=true&langs_count=6&hide=CSS%2CTypst%2CHTML&hide_border=true&bg_color=00000000&title_color=111111&text_color=555555"), True),
    ("contributions.svg", os.environ.get("CONTRIBUTION_CHART_URL", "https://ghchart.rshah.org/jay-waves"), False),
)


def download(url):
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "site-preview/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read().decode("utf-8")
        except (OSError, urllib.error.URLError) as error:
            if attempt == 3:
                raise RuntimeError(f"Could not download {url}: {error}") from error
            time.sleep(2 ** attempt)


def main():
    output = Path(sys.argv[1]) / "assets"
    output.mkdir(parents=True, exist_ok=True)
    for name, url, left in URLS:
        print(f"Fetching {name}", flush=True)
        svg = download(url)
        if left:
            svg = svg.replace("</style>", "* { animation: none !important; } .stagger { opacity: 1 !important; }</style>")
        replacements = {
            "'Segoe UI', Ubuntu, Sans-Serif": FONT,
            "'Segoe UI', Ubuntu, \"Helvetica Neue\", Sans-Serif": FONT,
            '"Segoe UI", Ubuntu, Sans-Serif': FONT,
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'": FONT,
            'font-family="Arial, Helvetica, sans-serif"': f'font-family="{FONT}"',
            "font-family='Arial, Helvetica, sans-serif'": f"font-family='{FONT}'",
        }
        for old, new in replacements.items():
            svg = svg.replace(old, new)
        if left:
            svg = svg.replace('<svg data-testid="lang-items" x="25">', '<svg data-testid="lang-items" x="0">')
        if "<svg" not in svg or FONT not in svg:
            raise ValueError(f"Unexpected SVG or font declaration in {name}")
        (output / name).write_text(svg, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
