#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd "$script_dir"

articles=()
while IFS= read -r -d '' article; do
    articles+=("$article")
done < <(find . -type f -name index.typ -print0 | sort -z)

if ((${#articles[@]} == 0)); then
    printf 'No article directories containing index.typ were found.\n'
    exit 0
fi

printf 'Compiling %d article(s)...\n' "${#articles[@]}"
for source in "${articles[@]}"; do
    article_dir=${source%/index.typ}
    article_name=${article_dir#./}
    printf 'Compiling %s...\n' "$article_name"
    (cd "$article_dir" && typst compile --features html --pretty index.typ index.html)
done

printf 'Compilation complete.\n'
