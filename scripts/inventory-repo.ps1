# Scout & Steward Repository Inventory
# Generates a compact reconnaissance packet from Git-tracked project resources.
#
# SAFETY:
# - Reads files only.
# - Does not modify application code or data.
# - Does not include secret/environment files.
# - Does not inspect generated dependency/cache directories.

$ErrorActionPreference = "Stop"

$RepoRoot = (git rev-parse --show-toplevel).Trim()

if (-not $RepoRoot) {
    throw "This script must be run inside a Git repository."
}

$OutputPath = Join-Path $RepoRoot "docs\REPO-INVENTORY.md"

# Files whose CONTENTS must never be copied into the report.
$SensitivePatterns = @(
    ".dev.vars",
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*secret*",
    "*credential*",
    "*account*.json"
)

# Generated/local paths that are not architectural resources.
$ExcludedPathPrefixes = @(
    ".git/",
    ".wrangler/",
    ".venv/",
    "venv/",
    "node_modules/",
    "__pycache__/"
)

# Text-based project resources whose contents are useful for reconnaissance.
$InspectableExtensions = @(
    ".md",
    ".json",
    ".jsonc",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".html",
    ".css",
    ".sql",
    ".py",
    ".ps1",
    ".php"
)

function Test-ExcludedPath {
    param([string]$Path)

    $Normalized = $Path.Replace("\", "/")

    foreach ($Prefix in $ExcludedPathPrefixes) {
        if ($Normalized.StartsWith($Prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

function Test-SensitivePath {
    param([string]$Path)

    $Leaf = Split-Path $Path -Leaf

    foreach ($Pattern in $SensitivePatterns) {
        if (
            $Path -like $Pattern -or
            $Leaf -like $Pattern
        ) {
            return $true
        }
    }

    return $false
}

function Get-ResourceCategory {
    param([string]$Path)

    $Normalized = $Path.Replace("\", "/")

    switch -Regex ($Normalized) {
        '^docs/adr/'       { return "Architecture Decisions" }
        '^docs/'           { return "Documentation" }
        '^migrations/'     { return "Database" }
        '^public/'         { return "Frontend" }
        '^src/services/'   { return "Backend Services" }
        '^src/components/' { return "Components" }
        '^src/views/'      { return "Views" }
        '^src/styles/'     { return "Styles" }
        '^src/'            { return "Application" }
        '^scripts/'        { return "Developer Tooling" }
        '^templates/'      { return "Templates" }
        '^config/'         { return "Configuration" }
        '^schema/'         { return "Schemas" }
        '^prompts/'        { return "Prompts" }
        default            { return "Repository Root" }
    }
}

function Get-DeclaredHint {
    param(
        [string]$Path,
        [string]$Content
    )

    $Extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()

    if ($Extension -eq ".md") {
        $Heading = $Content -split "`r?`n" |
            Where-Object { $_ -match '^#\s+\S' } |
            Select-Object -First 1

        if ($Heading) {
            return ($Heading -replace '^#\s+', '').Trim()
        }
    }

    if ($Content -match '(?im)^\s*(?:\/\/|#|\/\*)\s*(?:purpose|description|responsibility)\s*[:\-]\s*(.+)$') {
        return $Matches[1].Trim()
    }

    return $null
}

function Get-ObservedHints {
    param(
        [string]$Path,
        [string]$Content
    )

    $Hints = New-Object System.Collections.Generic.List[string]

    $ImportMatches = [regex]::Matches(
        $Content,
        '(?m)(?:from\s+|require\(|import\s+.*?from\s+)[`"'']([^`"'']+)[`"'']'
    )

    $Imports = $ImportMatches |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object -Unique |
        Select-Object -First 10

    if ($Imports) {
        $Hints.Add("References/imports: " + ($Imports -join ", "))
    }

    $RouteMatches = [regex]::Matches(
        $Content,
        '(?i)(?:GET|POST|PUT|PATCH|DELETE)\s+(/[A-Za-z0-9_./:{}-]+)'
    )

    $Routes = $RouteMatches |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object -Unique |
        Select-Object -First 15

    if ($Routes) {
        $Hints.Add("Routes mentioned: " + ($Routes -join ", "))
    }

    $TableMatches = [regex]::Matches(
        $Content,
        '(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?([A-Za-z0-9_]+)'
    )

    $Tables = $TableMatches |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object -Unique

    if ($Tables) {
        $Hints.Add("Tables defined: " + ($Tables -join ", "))
    }

    return $Hints
}

$TrackedFiles = git ls-files |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ } |
    Where-Object { -not (Test-ExcludedPath $_) }

$Report = New-Object System.Collections.Generic.List[string]

$Report.Add("# Repository Inventory")
$Report.Add("")
$Report.Add("> Generated automatically by ``scripts/inventory-repo.ps1``.")
$Report.Add("> This is a reconnaissance document, not an architectural authority.")
$Report.Add("")
$Report.Add("**Repository:** ``$(Split-Path $RepoRoot -Leaf)``  ")
$Report.Add("**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  ")
$Report.Add("**Tracked project resources:** $($TrackedFiles.Count)")
$Report.Add("")
$Report.Add("---")
$Report.Add("")
$Report.Add("## Inventory Summary")
$Report.Add("")

$Inventory = foreach ($RelativePath in $TrackedFiles) {
    $FullPath = Join-Path $RepoRoot $RelativePath

    if (-not (Test-Path $FullPath -PathType Leaf)) {
        continue
    }

    $Item = Get-Item $FullPath

    [PSCustomObject]@{
        Path      = $RelativePath.Replace("\", "/")
        Category  = Get-ResourceCategory $RelativePath
        Extension = if ($Item.Extension) { $Item.Extension } else { "(none)" }
        Bytes     = $Item.Length
        Sensitive = Test-SensitivePath $RelativePath
    }
}

$Grouped = $Inventory | Group-Object Category | Sort-Object Name

foreach ($Group in $Grouped) {
    $Report.Add("### $($Group.Name)")
    $Report.Add("")
    $Report.Add("| Resource | Type | Bytes |")
    $Report.Add("|---|---:|---:|")

    foreach ($Resource in ($Group.Group | Sort-Object Path)) {
        $Report.Add(
            "| ``$($Resource.Path)`` | $($Resource.Extension) | $($Resource.Bytes) |"
        )
    }

    $Report.Add("")
}

$Report.Add("---")
$Report.Add("")
$Report.Add("## Resource Reconnaissance")
$Report.Add("")

foreach ($Resource in ($Inventory | Sort-Object Category, Path)) {

    $Report.Add("### ``$($Resource.Path)``")
    $Report.Add("")
    $Report.Add("**Category:** $($Resource.Category)  ")
    $Report.Add("**Size:** $($Resource.Bytes) bytes  ")

    if ($Resource.Sensitive) {
        $Report.Add("**Inspection:** Content intentionally excluded (potentially sensitive).")
        $Report.Add("")
        continue
    }

    $Extension = [System.IO.Path]::GetExtension($Resource.Path).ToLowerInvariant()

    if ($InspectableExtensions -notcontains $Extension) {
        $Report.Add("**Inspection:** Listed only; content not inspected by this script.")
        $Report.Add("")
        continue
    }

    $FullPath = Join-Path $RepoRoot $Resource.Path

    try {
        $Content = Get-Content $FullPath -Raw
    }
    catch {
        $Report.Add("**Inspection:** Could not read content.")
        $Report.Add("")
        continue
    }

    $Declared = Get-DeclaredHint -Path $Resource.Path -Content $Content

    if ($Declared) {
        $Report.Add("**Declared clue:** $Declared  ")
    }
    else {
        $Report.Add("**Declared clue:** None detected.  ")
    }

    $Observed = Get-ObservedHints -Path $Resource.Path -Content $Content

    if ($Observed.Count -gt 0) {
        foreach ($Hint in $Observed) {
            $Report.Add("**Observed:** $Hint  ")
        }
    }
    else {
        $Report.Add("**Observed:** No structural hints automatically detected.  ")
    }

    $Report.Add("")
}

$Report.Add("---")
$Report.Add("")
$Report.Add("## Empty / Untracked Structural Directories")
$Report.Add("")
$Report.Add("> These may represent reserved architecture rather than implemented resources.")
$Report.Add("")

$CandidateDirectories = @(
    "src\components",
    "src\views",
    "src\styles",
    "scripts"
)

foreach ($Directory in $CandidateDirectories) {
    $FullDirectory = Join-Path $RepoRoot $Directory

    if (Test-Path $FullDirectory -PathType Container) {
        $TrackedWithin = $TrackedFiles |
            Where-Object {
                $_.Replace("/", "\").StartsWith(
                    "$Directory\",
                    [System.StringComparison]::OrdinalIgnoreCase
                )
            }

        if (-not $TrackedWithin) {
            $Report.Add("- ``$($Directory.Replace('\','/'))/`` — exists, but contains no tracked resources.")
        }
    }
}

$Report.Add("")
$Report.Add("---")
$Report.Add("")
$Report.Add("## Interpretation Key")
$Report.Add("")
$Report.Add("- **Declared clue** — purpose explicitly stated by the resource.")
$Report.Add("- **Observed** — structural behavior detectable directly from its contents.")
$Report.Add("- **Likely purpose** — intentionally left for human/AI architectural review.")
$Report.Add("- **Sensitive** — listed when appropriate, but contents are not copied into this report.")
$Report.Add("")
$Report.Add("This inventory describes materials present in the repository. It does not determine whether those materials are correct, current, necessary, or sufficient.")

$Report | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host ""
Write-Host "Repository inventory complete."
Write-Host "Report: $OutputPath"
Write-Host "Resources inventoried: $($Inventory.Count)"
Write-Host ""
