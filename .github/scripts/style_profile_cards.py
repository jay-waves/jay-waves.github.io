#!/usr/bin/env python3
"""Apply the site's typography and layout to downloaded profile card SVGs."""

from pathlib import Path
import sys


FONT_STACK = "Georgia, 'Times New Roman', 'Noto Serif', 'Noto Serif CJK SC', 'Noto Serif SC', serif"


def style_svg(path: Path, *, flush_left: bool = False) -> None:
    svg = path.read_text(encoding="utf-8")
    svg = svg.replace("'Segoe UI', Ubuntu, Sans-Serif", FONT_STACK)
    svg = svg.replace("'Segoe UI', Ubuntu, \"Helvetica Neue\", Sans-Serif", FONT_STACK)
    svg = svg.replace('"Segoe UI", Ubuntu, Sans-Serif', FONT_STACK)
    svg = svg.replace(
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, "
        "'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
        FONT_STACK,
    )
    svg = svg.replace(
        'font-family="Arial, Helvetica, sans-serif"',
        f'font-family="{FONT_STACK}"',
    )
    svg = svg.replace(
        "font-family='Arial, Helvetica, sans-serif'",
        f"font-family='{FONT_STACK}'",
    )
    if flush_left:
        svg = svg.replace(
            '<svg data-testid="lang-items" x="25">',
            '<svg data-testid="lang-items" x="0">',
        )
    path.write_text(svg, encoding="utf-8", newline="\n")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"Usage: {Path(sys.argv[0]).name} LANGUAGE_CARD.svg CONTRIBUTION_CHART.svg")

    style_svg(Path(sys.argv[1]), flush_left=True)
    style_svg(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
