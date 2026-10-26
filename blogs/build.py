from pathlib import Path
import subprocess
import sys


root = Path(__file__).resolve().parent
articles = sorted(root.rglob("index.typ"))

if not articles:
    print("No article directories containing index.typ were found.")
    raise SystemExit(0)

print(f"Compiling {len(articles)} article(s)...")
failed_articles = []
for source in articles:
    article_dir = source.parent
    article_name = article_dir.relative_to(root).as_posix()
    print(f"Compiling {article_name}...")
    result = subprocess.run(
        ["typst", "compile", "--features", "html", "--pretty", "index.typ", "index.html"],
        cwd=article_dir,
    )
    if result.returncode:
        failed_articles.append(article_name)

subprocess.run([sys.executable, str(root / "add-meta.py")], check=True)
if failed_articles:
    print("Compilation failed for: " + ", ".join(failed_articles), file=sys.stderr)
    raise SystemExit(1)

print("Compilation complete.")
