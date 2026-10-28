#!/usr/bin/env python3
"""Build the site and serve a local preview."""
import argparse
from pathlib import Path
import subprocess
import sys

SCRIPTS = Path(__file__).resolve().parent
OUTPUT = SCRIPTS.parents[1] / "dist" / "preview"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Include articles marked PAGES_IGNORE")
    parser.add_argument("--build-only", action="store_true", help="Build without starting the preview server")
    parser.add_argument("--port", type=int, default=8000, help="Preview server port (default: 8000)")
    args = parser.parse_args()
    command = [sys.executable, str(SCRIPTS / "build.py")]
    if args.all:
        command.append("--all")
    result = subprocess.run(command)
    if result.returncode or args.build_only:
        return result.returncode
    print(f"Preview: http://localhost:{args.port}/blogs/ (Ctrl+C to stop)", flush=True)
    try:
        return subprocess.run([sys.executable, "-m", "http.server", str(args.port),
                               "--bind", "127.0.0.1", "--directory", str(OUTPUT)]).returncode
    except KeyboardInterrupt:
        print("\nPreview stopped.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
