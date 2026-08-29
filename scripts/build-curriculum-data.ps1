<#
.SYNOPSIS
Builds Scripture Memo's checked-in curriculum dataset from the approved source documents.

.DESCRIPTION
This maintenance script converts the project owner's audited Excel workbook and
Word study guide into one deterministic JSON file consumed by Prisma seeding and
the guarded local curriculum reset. It is deliberately a build-time tool: the
application never parses Office documents during a request and therefore incurs
no database operations or runtime Office-processing cost.

The workbook is authoritative for canonical references, public-domain
translation text, and the four waypoint assignments for each verse. Its tags
form the base tag set. For covered verses, the audited study guide contributes
additional tags and formatted Markdown. Missing study sections are valid because
the project owner will supply those later.

.PARAMETER WorkbookPath
Path to the approved 100-verse `.xlsx` workbook.

.PARAMETER StudyGuidePath
Path to the existing `.docx` study guide. The current guide covers 31 verses.

.PARAMETER OutputPath
Destination for the generated UTF-8 JSON dataset.

.SECURITY
The script never connects to a database and never evaluates document macros.
Office files are treated only as ZIP archives containing XML. It refuses partial,
duplicate, non-contiguous, or internally inconsistent curriculum data before it
writes output.

.EXAMPLE
./scripts/build-curriculum-data.ps1
#>
[CmdletBinding()]
param(
  [string]$WorkbookPath = "",
  [string]$StudyGuidePath = "",
  [string]$OutputPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$WordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

# Windows PowerShell evaluates parameter defaults before `$PSScriptRoot` is
# reliably available. Resolve omitted paths only after script initialization so
# the command behaves identically from PowerShell 5.1 and modern PowerShell.
if ([string]::IsNullOrWhiteSpace($WorkbookPath)) {
  $WorkbookPath = Join-Path $PSScriptRoot "../prisma/source-data/Scripture-Memo-Master-Verse-List-100-Updated-Waypoints.xlsx"
}
if ([string]::IsNullOrWhiteSpace($StudyGuidePath)) {
  $StudyGuidePath = Join-Path $PSScriptRoot "../prisma/source-data/Scripture-Memo-Study-Guide.docx"
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $PSScriptRoot "../prisma/data/curriculum.json"
}

# Reads one XML member without extracting an Office archive to disk. The archive
# and stream are always disposed, including when XML is malformed.
function Read-OfficeArchiveEntry {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [string]$EntryName
  )

  $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $archive.GetEntry($EntryName)
    if (-not $entry) {
      throw "Required Office archive entry '$EntryName' is missing from '$Path'."
    }

    $reader = [System.IO.StreamReader]::new($entry.Open())
    try {
      return $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
    }
  }
  finally {
    $archive.Dispose()
  }
}

# Normalizes typography so Excel and Word references compare consistently.
function ConvertTo-ReferenceKey {
  param([Parameter(Mandatory)] [string]$Reference)

  return ($Reference.Trim() -replace "[\u2010-\u2015]", "-" -replace "\s+", " ").ToLowerInvariant()
}

# Converts rich Word runs to Markdown while preserving bold and italic intent.
# Empty runs are ignored and text remains Unicode; embedded HTML is never made.
function ConvertTo-MarkdownRuns {
  param(
    [Parameter(Mandatory)] [System.Xml.XmlNode]$Paragraph,
    [Parameter(Mandatory)] [System.Xml.XmlNamespaceManager]$NamespaceManager
  )

  $parts = foreach ($run in $Paragraph.SelectNodes("./w:r", $NamespaceManager)) {
    $text = (($run.SelectNodes(".//w:t", $NamespaceManager) | ForEach-Object {
      $_.'#text'
    }) -join "")

    if ([string]::IsNullOrEmpty($text)) {
      continue
    }

    # Word stores bold and italic at run level. Nesting the Markdown markers
    # reproduces combined emphasis without allowing arbitrary document HTML.
    $isBold = $null -ne $run.SelectSingleNode("./w:rPr/w:b", $NamespaceManager)
    $isItalic = $null -ne $run.SelectSingleNode("./w:rPr/w:i", $NamespaceManager)
    $leadingWhitespace = if ($text -match "^(\s+)") { $Matches[1] } else { "" }
    $trailingWhitespace = if ($text -match "(\s+)$") { $Matches[1] } else { "" }
    $formatted = $text.Trim()
    if ($isBold) {
      $formatted = "**$formatted**"
    }
    if ($isItalic) {
      $formatted = "*$formatted*"
    }

    "$leadingWhitespace$formatted$trailingWhitespace"
  }

  return ($parts -join "")
}

# Parses shared strings and both worksheets into validated curriculum records.
# No data is inferred: all 100 references and all 400 positions must be explicit.
function Read-CurriculumWorkbook {
  param([Parameter(Mandatory)] [string]$Path)

  [xml]$sharedStringsXml = Read-OfficeArchiveEntry $Path "xl/sharedStrings.xml"
  $sharedStrings = @(
    foreach ($item in $sharedStringsXml.sst.si) {
      if ($item.t) {
        [string]$item.t
      }
      else {
        (($item.r | ForEach-Object { $_.t }) -join "")
      }
    }
  )

  function Get-CellValue {
    param([Parameter(Mandatory)] [System.Xml.XmlNode]$Cell)

    $valueNode = $Cell.SelectSingleNode("./*[local-name()='v']")
    $rawValue = if ($valueNode) { [string]$valueNode.InnerText } else { "" }
    $cellType = $Cell.GetAttribute("t")
    if ($cellType -eq "s" -and $rawValue -ne "") {
      return $sharedStrings[[int]$rawValue]
    }
    if ($cellType -eq "inlineStr") {
      $inlineText = $Cell.SelectSingleNode("./*[local-name()='is']/*[local-name()='t']")
      return if ($inlineText) { [string]$inlineText.InnerText } else { "" }
    }
    return $rawValue
  }

  function Get-RowValues {
    param([Parameter(Mandatory)] [System.Xml.XmlNode]$Row)

    $values = @{}
    foreach ($cell in $Row.c) {
      $column = ([string]$cell.r) -replace "\d", ""
      $values[$column] = Get-CellValue $cell
    }
    return $values
  }

  [xml]$waypointXml = Read-OfficeArchiveEntry $Path "xl/worksheets/sheet1.xml"
  [xml]$verseXml = Read-OfficeArchiveEntry $Path "xl/worksheets/sheet2.xml"

  $verses = @(
    foreach ($row in ($verseXml.worksheet.sheetData.row | Select-Object -Skip 1)) {
      $values = Get-RowValues $row
      # The canonical Bible book is "Psalms", while an individual reference is
      # singular (for example, "Psalm 23:1"). Older source workbooks used the
      # singular value in both places, which created duplicate admin filters
      # once a verse was added through the canonical book selector.
      $book = ([string]$values.B).Trim()
      if ($book -eq "Psalm") {
        $book = "Psalms"
      }

      [ordered]@{
        reference = ([string]$values.A).Trim()
        book = $book
        chapter = [int]$values.C
        verseStart = [int]$values.D
        verseEnd = if ([string]::IsNullOrWhiteSpace([string]$values.E)) {
          $null
        }
        else {
          [int]$values.E
        }
        tags = @(([string]$values.F).Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        translations = [ordered]@{
          KJV = ([string]$values.G).Trim()
          WEB = ([string]$values.H).Trim()
          BSB = ([string]$values.I).Trim()
        }
      }
    }
  )

  $waypoints = [System.Collections.Generic.List[object]]::new()
  $stageColumns = [ordered]@{
    C = "LEARN"
    D = "RECALL"
    E = "STRENGTHEN"
    F = "MASTER"
  }

  foreach ($row in ($waypointXml.worksheet.sheetData.row | Select-Object -Skip 1)) {
    $values = Get-RowValues $row
    $reference = ([string]$values.B).Trim()

    foreach ($column in $stageColumns.Keys) {
      $waypointLabel = [string]$values[$column]
      if ($waypointLabel -notmatch "^W(\d+)$") {
        throw "Invalid waypoint label '$waypointLabel' for '$reference'."
      }

      $waypoints.Add([ordered]@{
        number = [int]$Matches[1]
        reference = $reference
        journeyStage = $stageColumns[$column]
      })
    }
  }

  return [ordered]@{
    verses = $verses
    waypoints = @($waypoints)
  }
}

# Converts each Heading 1 study-guide section into semantic Markdown. Heading 1
# is the lookup key and is omitted because Sanctuary renders the page title.
function Read-StudyGuideMarkdown {
  param([Parameter(Mandatory)] [string]$Path)

  [xml]$document = Read-OfficeArchiveEntry $Path "word/document.xml"
  $namespaceManager = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
  $namespaceManager.AddNamespace("w", $WordNamespace)

  $sections = @{}
  $currentReference = $null
  $currentLines = [System.Collections.Generic.List[string]]::new()

  function Save-CurrentSection {
    if (-not $currentReference) {
      return
    }

    $key = ConvertTo-ReferenceKey $currentReference
    if ($sections.ContainsKey($key)) {
      throw "Duplicate study-guide section '$currentReference'."
    }

    $sections[$key] = (($currentLines -join "`n`n").Trim())
  }

  foreach ($paragraph in $document.SelectNodes("//w:body/w:p", $namespaceManager)) {
    $styleNode = $paragraph.SelectSingleNode("./w:pPr/w:pStyle", $namespaceManager)
    $style = if ($styleNode) {
      $styleNode.GetAttribute("val", $WordNamespace)
    }
    else {
      "Normal"
    }
    $markdownText = ConvertTo-MarkdownRuns $paragraph $namespaceManager

    if ($style -eq "Heading1") {
      Save-CurrentSection
      $currentReference = (($paragraph.SelectNodes(".//w:t", $namespaceManager) | ForEach-Object {
        $_.'#text'
      }) -join "").Trim()
      $currentLines = [System.Collections.Generic.List[string]]::new()
      continue
    }

    if (-not $currentReference -or [string]::IsNullOrWhiteSpace($markdownText)) {
      continue
    }

    switch -Wildcard ($style) {
      "Heading2" {
        $currentLines.Add("## $markdownText")
      }
      "Heading3" {
        $currentLines.Add("### $markdownText")
      }
      "List*" {
        $currentLines.Add("- $markdownText")
      }
      default {
        $currentLines.Add($markdownText)
      }
    }
  }

  Save-CurrentSection
  return $sections
}

# Stops generation before partial or ambiguous curriculum can be checked in.
function Assert-CurriculumIntegrity {
  param(
    [Parameter(Mandatory)] [object[]]$Verses,
    [Parameter(Mandatory)] [object[]]$Waypoints,
    [Parameter(Mandatory)] [hashtable]$StudySections
  )

  if ($Verses.Count -ne 100) {
    throw "Expected 100 complete verses; found $($Verses.Count)."
  }
  if ($Waypoints.Count -ne 400) {
    throw "Expected 400 waypoint assignments; found $($Waypoints.Count)."
  }

  $verseKeys = @($Verses | ForEach-Object { ConvertTo-ReferenceKey $_.reference })
  if (@($verseKeys | Sort-Object -Unique).Count -ne $Verses.Count) {
    throw "Verse references must be unique after dash and whitespace normalization."
  }

  foreach ($verse in $Verses) {
    foreach ($translation in "KJV", "WEB", "BSB") {
      if ([string]::IsNullOrWhiteSpace([string]$verse.translations[$translation])) {
        throw "Verse '$($verse.reference)' is missing $translation text."
      }
    }
  }

  $numbers = @($Waypoints.number | Sort-Object)
  $expectedNumbers = @(1..400)
  if (@(Compare-Object $numbers $expectedNumbers).Count -ne 0) {
    throw "Waypoint numbers must be unique and contiguous from 1 through 400."
  }

  foreach ($waypoint in $Waypoints) {
    if ((ConvertTo-ReferenceKey $waypoint.reference) -notin $verseKeys) {
      throw "Waypoint $($waypoint.number) references unknown verse '$($waypoint.reference)'."
    }
  }

  foreach ($studyKey in $StudySections.Keys) {
    if ($studyKey -notin $verseKeys) {
      throw "Study guide contains unknown reference '$studyKey'."
    }
  }
}

# Extracts the dedicated Tags section from one trusted study-guide Markdown
# block. Tags remain structured VerseTag data; they are not stored as a reader
# section. Returning an empty array is safe for guides without a Tags heading.
function Read-StudyGuideTags {
  param(
    [AllowNull()] [string]$Markdown
  )

  if ([string]::IsNullOrWhiteSpace($Markdown)) {
    return @()
  }

  $match = [regex]::Match(
    $Markdown,
    '(?ms)^## Tags\s+\*\*(.+?)\*\*'
  )
  if (-not $match.Success) {
    return @()
  }

  # Use the Unicode code point instead of a literal bullet in the executable
  # expression. Windows PowerShell 5.1 can otherwise decode a UTF-8 script
  # without a BOM using the active ANSI code page and fail to recognize it.
  $bullet = [char]0x2022
  return @(
    $match.Groups[1].Value -split "\s*$bullet\s*" |
      ForEach-Object { $_.Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
}

# Removes the Tags heading after its values have been merged into structured
# curriculum tags. Keeping the same labels inside studyNote would create a second
# database representation and invite future divergence between the admin form,
# Sanctuary, and imported Markdown.
function Remove-StudyGuideTagsSection {
  param(
    [AllowNull()] [string]$Markdown
  )

  if ([string]::IsNullOrWhiteSpace($Markdown)) {
    return $Markdown
  }

  return [regex]::Replace(
    $Markdown,
    '(?ms)^## Tags\s+\*\*(.+?)\*\*\s*',
    ''
  ).Trim()
}

# Merges Excel and study-guide tags case-insensitively while preserving the
# source order and preferred display casing. This retains broad workbook tags
# such as "Comfort" and adds the guide's more specific discovery terms without
# creating duplicates that differ only by capitalization.
function Merge-CurriculumTags {
  param(
    [Parameter(Mandatory)] [object[]]$WorkbookTags,
    [AllowNull()] [string]$StudyMarkdown
  )

  $merged = [System.Collections.Generic.List[string]]::new()
  $seen = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )

  foreach ($tag in @($WorkbookTags) + @(Read-StudyGuideTags $StudyMarkdown)) {
    $label = ([string]$tag).Trim()
    if (-not [string]::IsNullOrWhiteSpace($label) -and $seen.Add($label)) {
      $merged.Add($label)
    }
  }

  return @($merged)
}

if (-not (Test-Path -LiteralPath $WorkbookPath)) {
  throw "Workbook not found: $WorkbookPath"
}
if (-not (Test-Path -LiteralPath $StudyGuidePath)) {
  throw "Study guide not found: $StudyGuidePath"
}

$workbook = Read-CurriculumWorkbook $WorkbookPath
$studySections = Read-StudyGuideMarkdown $StudyGuidePath
Assert-CurriculumIntegrity `
  -Verses $workbook.verses `
  -Waypoints $workbook.waypoints `
  -StudySections $studySections

$datasetVerses = @(
  foreach ($verse in $workbook.verses) {
    $studyKey = ConvertTo-ReferenceKey $verse.reference
    $studyMarkdown = if ($studySections.ContainsKey($studyKey)) {
      $studySections[$studyKey]
    }
    else {
      $null
    }
    [ordered]@{
      reference = $verse.reference
      book = $verse.book
      chapter = $verse.chapter
      verseStart = $verse.verseStart
      verseEnd = $verse.verseEnd
      tags = @(Merge-CurriculumTags $verse.tags $studyMarkdown)
      translations = $verse.translations
      reflection = $null
      studyNote = Remove-StudyGuideTagsSection $studyMarkdown
      isActive = $true
    }
  }
)

$dataset = [ordered]@{
  schemaVersion = 1
  source = [ordered]@{
    workbook = [System.IO.Path]::GetFileName($WorkbookPath)
    studyGuide = [System.IO.Path]::GetFileName($StudyGuidePath)
  }
  verses = $datasetVerses
  waypoints = @($workbook.waypoints | Sort-Object number | ForEach-Object {
    [ordered]@{
      number = $_.number
      reference = $_.reference
      journeyStage = $_.journeyStage
      isActive = $true
    }
  })
}

$outputDirectory = Split-Path -Parent $OutputPath
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

# ConvertTo-Json preserves the ordered schema while UTF-8 without BOM keeps the
# generated file portable across Node, Git, and deployment environments.
$json = $dataset | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText(
  $OutputPath,
  "$json`n",
  [System.Text.UTF8Encoding]::new($false)
)

Write-Output (
  "Generated $($datasetVerses.Count) verses, $($dataset.waypoints.Count) waypoints, " +
  "and $($studySections.Count) formatted study guides at '$OutputPath'."
)
