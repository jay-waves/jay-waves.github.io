$ErrorActionPreference = "Stop"

$articles = Get-ChildItem -Path $PSScriptRoot -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName "index.typ") }

if ($articles.Count -eq 0) {
    Write-Host "No article directories containing index.typ were found."
    exit 0
}

Write-Host "Compiling $($articles.Count) article(s)..."

foreach ($article in $articles) {
    Write-Host "Compiling $($article.Name)..."

    Push-Location $article.FullName
    try {
        & typst compile --features html --pretty index.typ index.html
        if ($LASTEXITCODE -ne 0) {
            throw "Compilation failed: $($article.Name)"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Compilation complete."
