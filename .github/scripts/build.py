#!/usr/bin/env python3
"""Build the site. Use --all to include PAGES_IGNORE articles."""
import argparse
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist" / "preview"
def package_root():
    if os.environ.get("TYPST_PACKAGE_PATH"):
        return Path(os.environ["TYPST_PACKAGE_PATH"])
    if sys.platform == "win32":
        return Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming") / "typst" / "packages"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "typst" / "packages"
    data_home = Path(os.environ.get("XDG_DATA_HOME", ""))
    if not data_home.is_absolute():
        data_home = Path.home() / ".local" / "share"
    return data_home / "typst" / "packages"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Include articles marked PAGES_IGNORE")
    args = parser.parse_args()
    return build(args, parser)


def build(args, parser):
    if not shutil.which("typst"):
        parser.error("typst is not on PATH; install Typst before building")
    wrapper = package_root() / "local" / "ypst-template" / "0.1.0" / "typst.py"
    if not wrapper.is_file():
        parser.exit(1, f"Typst template not found at {wrapper}. Install it using the ypst-template installer.\n")
    if importlib.util.find_spec("tree_sitter_language_pack") is None:
        parser.exit(1, "Missing template dependencies. Install them from the ypst-template repository's requirements.txt.\n")

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)
    for name in ("index.html", "style.css", "feed.xml", "CNAME"):
        shutil.copy2(ROOT / name, OUTPUT / name)
    shutil.copytree(ROOT / "assets", OUTPUT / "assets")
    stats = subprocess.run([sys.executable, str(SCRIPTS / "fetch-stats.py"), str(OUTPUT)])
    if stats.returncode:
        print("Error: profile SVG download failed.", file=sys.stderr)
        return 1

    def ignored(directory, names):
        root = Path(directory)
        return [name for name in names if name == "PAGES_IGNORE" or
                (not args.all and (root / name).is_dir() and (root / name / "PAGES_IGNORE").is_file())]

    if not args.all and (ROOT / "blogs" / "PAGES_IGNORE").is_file():
        (OUTPUT / "blogs").mkdir()
        shutil.copy2(ROOT / "blogs" / "index.html", OUTPUT / "blogs" / "index.html")
    else:
        shutil.copytree(ROOT / "blogs", OUTPUT / "blogs", ignore=ignored)
    for path in (OUTPUT / "blogs").glob("20??/**/index.html"):
        path.unlink()

    failed = []
    sources = sorted((OUTPUT / "blogs").rglob("index.typ"))
    for staged in sources:
        relative = staged.relative_to(OUTPUT)
        source = ROOT / relative
        print(f"Compiling {relative.as_posix()}", flush=True)
        result = subprocess.run([sys.executable, str(wrapper), "compile", "index.typ",
                                 str(staged.parent), "--site-root", str(OUTPUT),
                                 "--no-line-anchors"], cwd=source.parent)
        if result.returncode:
            failed.append(relative.as_posix())

    print(f"\nCompiled {len(sources) - len(failed)}/{len(sources)} articles into {OUTPUT}")
    if failed:
        print("Failed: " + ", ".join(failed), file=sys.stderr)
        return 1
    subprocess.run([sys.executable, str(SCRIPTS / "postprocess-blogs.py"), str(OUTPUT)], check=True)
    subprocess.run([sys.executable, str(SCRIPTS / "generate-blog-list.py"), str(OUTPUT)], check=True)
    (OUTPUT / ".nojekyll").touch()
    return 0


if __name__ == "__main__":
    sys.exit(main())
