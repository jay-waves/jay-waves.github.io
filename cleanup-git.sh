#!/usr/bin/env bash
set -euo pipefail

remote=${1:-origin}
start_time=$SECONDS

show_step() {
    printf '[%0.1fs] %s\n' "$((SECONDS - start_time))" "$1"
}

show_step '1/5 Checking the working tree...'
branch=$(git branch --show-current)
if [[ -z $branch ]]; then
    printf 'Error: Run this script from a checked-out branch.\n' >&2
    exit 1
fi
if [[ -n $(git status --porcelain) ]]; then
    printf 'Error: Commit or stash your changes first.\n' >&2
    exit 1
fi

old_head=$(git rev-parse HEAD)
tree=$(git rev-parse 'HEAD^{tree}')
show_step "2/5 Contacting $remote (waiting for network/authentication)..."
remote_head=$(git ls-remote "$remote" "refs/heads/$branch" | awk 'NR == 1 { print $1 }')
if [[ -z $remote_head ]]; then
    printf 'Error: Remote branch %s/%s was not found.\n' "$remote" "$branch" >&2
    exit 1
fi

printf 'Branch: %s\nRemote branch: %s/%s\n' "$branch" "$remote" "$branch"
if [[ ! -t 0 ]]; then
    printf 'Error: Interactive confirmation requires a terminal.\n' >&2
    exit 1
fi
read -r -p 'Discard all history and force-push one new root commit? Type YES: ' answer
if [[ $answer != YES ]]; then
    printf 'Cancelled.\n'
    exit 0
fi

show_step '3/5 Creating root commit from the existing snapshot...'
new_root=$(git commit-tree "$tree" -m 'chore: reset git history')
show_step '4/5 Replacing local branch history...'
git update-ref "refs/heads/$branch" "$new_root" "$old_head"
show_step '5/5 Pushing (Git packing and upload progress follows)...'
git push --progress "$remote" "HEAD:refs/heads/$branch" "--force-with-lease=refs/heads/$branch:$remote_head"
show_step "Done: $remote/$branch now has the rewritten history."
