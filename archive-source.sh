#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

archive_dir="$repo_root/archives"
mkdir -p "$archive_dir"
timestamp=$(date '+%Y%m%d-%H%M%S')
archive_path="$archive_dir/source-$timestamp.zip"

git ls-files -z | xargs -0 7z a -tzip -mx=0 "$archive_path" --

printf 'Created archive: %s\n' "$archive_path"
