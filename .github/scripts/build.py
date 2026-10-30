#!/usr/bin/env python3
"""Build the site. Use --all to include PAGES_IGNORE articles."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist" / "preview"
TEMPLATE_URL = "https://github.com/jay-waves/yst-template.git"
TEMPLATE_BRANCH = "main"


def ensure_template():
    package_root = Path(os.environ["TYPST_PACKAGE_PATH"])
    target = package_root / "local" / "ypst-template" / "0.1.0"
    if target.exists():
        if not (target / ".git").is_dir() or not (target / "typst.toml").is_file():
            raise RuntimeError(f"Incomplete cached template directory: {target}")
        origin = subprocess.check_output(["git", "-C", str(target), "remote", "get-url", "origin"], text=True).strip()
        branch = subprocess.check_output(["git", "-C", str(target), "branch", "--show-current"], text=True).strip()
        dirty = subprocess.check_output(["git", "-C", str(target), "status", "--porcelain"], text=True).strip()
        if origin != TEMPLATE_URL or branch != TEMPLATE_BRANCH or dirty:
            raise RuntimeError(f"Cached template has a different origin, branch, or local changes: {target}")
        print(f"Updating cached Typst template: {target}", flush=True)
        subprocess.run(["git", "-C", str(target), "pull", "--ff-only", "origin", TEMPLATE_BRANCH], check=True)
        return
    if not shutil.which("git"):
        raise RuntimeError("Git is required to download the Typst template")
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"Cloning {TEMPLATE_URL} ({TEMPLATE_BRANCH}) to {target}", flush=True)
    with tempfile.TemporaryDirectory(prefix="ypst-template-", dir=target.parent) as temporary:
        checkout = Path(temporary) / "checkout"
        subprocess.run(["git", "clone", "--quiet", "--depth", "1", "--branch", TEMPLATE_BRANCH,
                        TEMPLATE_URL, str(checkout)], check=True)
        if not (checkout / "typst.toml").is_file():
            raise RuntimeError("Downloaded template has no typst.toml")
        checkout.rename(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Include articles marked PAGES_IGNORE")
    args = parser.parse_args()
    if not shutil.which("git"):
        parser.error("Git is required to check the Typst template version")
    os.environ["TYPST_PACKAGE_PATH"] = str(ROOT / "dist" / "typst-packages")
    return build(args, parser)


def build(args, parser):
    if not shutil.which("typst"):
        parser.error("typst is not on PATH; install Typst before building")
    try:
        ensure_template()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Unable to prepare Typst template: {error}\n")

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
        wrapper = Path(os.environ["TYPST_PACKAGE_PATH"]) / "local" / "ypst-template" / "0.1.0" / "typst.py"
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
