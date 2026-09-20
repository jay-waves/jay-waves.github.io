param(
    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
    & git.exe @args
    if ($LASTEXITCODE -ne 0) { throw "Git command failed: git $($args -join ' ')" }
}

$timer = [System.Diagnostics.Stopwatch]::StartNew()
function Show-Step([string]$Message) {
    Write-Host ("[{0:N1}s] {1}" -f $timer.Elapsed.TotalSeconds, $Message)
}

Show-Step "1/5 Checking the working tree..."
$branch = (Invoke-Git branch --show-current).Trim()
if (-not $branch) { throw "Run this script from a checked-out branch." }
if (Invoke-Git status --porcelain) { throw "Commit or stash your changes first." }

$oldHead = (Invoke-Git rev-parse HEAD).Trim()
$tree = (Invoke-Git rev-parse 'HEAD^{tree}').Trim()
Show-Step "2/5 Contacting $Remote (waiting for network/authentication)..."
$remoteHead = (Invoke-Git ls-remote $Remote "refs/heads/$branch") -split "\s+"
if (-not $remoteHead[0]) { throw "Remote branch $Remote/$branch was not found." }

Write-Host "Branch: $branch"
Write-Host "Remote branch: $Remote/$branch"
if ((Read-Host "Discard all history and force-push one new root commit? Type YES") -cne "YES") { return }

Show-Step "3/5 Creating root commit from the existing snapshot..."
$newRoot = (Invoke-Git commit-tree $tree -m "chore: reset git history").Trim()
Show-Step "4/5 Replacing local branch history..."
Invoke-Git update-ref "refs/heads/$branch" $newRoot $oldHead
Show-Step "5/5 Pushing (Git packing and upload progress follows)..."
Invoke-Git push --progress $Remote "HEAD:refs/heads/$branch" "--force-with-lease=refs/heads/$branch`:$($remoteHead[0])"
Show-Step "Done: $Remote/$branch now has the rewritten history."
