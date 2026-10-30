#!/usr/bin/env python3
"""Generate blog lists from the RSS feed."""
from collections import OrderedDict
from html import escape
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

site = Path(sys.argv[1])
feed = ET.parse(site / "feed.xml")
channel = feed.getroot().find("channel")
if channel is None:
    raise SystemExit("RSS feed has no channel")

groups = OrderedDict()
for item in list(channel.findall("item")):
    title = item.findtext("title", "").strip()
    link = item.findtext("link", "").strip()
    parsed = urlsplit(link)
    match = re.fullmatch(r"/blogs/(\d{4})/(\d{2})/([a-zA-Z0-9_-]+)/", parsed.path)
    if not title or parsed.scheme != "https" or parsed.netloc != "jay-waves.cn" or not match or parsed.query or parsed.fragment:
        raise SystemExit(f"Invalid blog title or link in feed: {link!r}")
    if not (site / parsed.path.lstrip("/") / "index.html").is_file():
        channel.remove(item)
        continue
    groups.setdefault(match.group(1), []).append((title, parsed.path))

lines = []
for year in sorted(groups, reverse=True):
    lines.extend([f'        <h3 class="post-year">{year}</h3>', '        <ul class="posts">'])
    for title, path in groups[year]:
        lines.extend(['          <li>', f'            <a href="{escape(path, quote=True)}">',
                      f'              {escape(title)}', '            </a>', '          </li>'])
    lines.append('        </ul>')

start, end = "        <!-- BLOG LIST START -->", "        <!-- BLOG LIST END -->"
for index in (site / "index.html", site / "blogs" / "index.html"):
    text = index.read_text(encoding="utf-8")
    if text.count(start) != 1 or text.count(end) != 1 or text.index(start) > text.index(end):
        raise SystemExit(f"Blog list markers are missing or invalid in {index}")
    before, rest = text.split(start, 1)
    _, after = rest.split(end, 1)
    index.write_text(before + start + "\n" + "\n".join(lines) + "\n" + end + after,
                     encoding="utf-8", newline="\n")
ET.register_namespace("atom", "http://www.w3.org/2005/Atom")
ET.indent(feed, space="  ")
feed.write(site / "feed.xml", encoding="utf-8", xml_declaration=True)
