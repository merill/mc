# Get the latest M365 Message Center and Microsoft 365 Roadmap items and update the site
#
# Default behavior:
# - Connects to Microsoft Graph and refreshes Message Center data.
# - Imports the Microsoft 365 Roadmap RSS feed.
# - Mirrors Azure updates from Microsoft's public API.
#
# Use -RoadmapOnly to skip Message Center during local development. Pull request
# checks use it too. Roadmap and Azure updates need no tenant, so they still refresh.

param($GraphSecret, [switch]$RoadmapOnly, [int]$NewPostMaxAgeDays = 14)
. "$PSScriptRoot/Entra-MessageFilter.ps1"
. "$PSScriptRoot/Graph-Tenants.ps1"

function Get-DefaultGraphSecret() {
    if(-not [string]::IsNullOrEmpty($GraphSecret)){
        return $GraphSecret
    }

    Write-Host "-GraphSecret not supplied"
    if(Test-Path ./@build/secrets-m365.json){ # Local development fallback
        return (Get-Content ./@build/secrets-m365.json | ConvertFrom-Json)
    }

    return $null
}
function Get-M365MessageCenterItems() {
    Write-Host "Getting Message Center items"
    $mc = Get-MgServiceAnnouncementMessage -Top 999  -Sort "LastModifiedDateTime desc" -All
    return $mc
}
function Get-AllTenantMessageCenterItems($PreviousItems) {
    # Message Center posts are tenant specific, so the archive is built from the
    # union of every configured tenant. Each tenant contributes the posts the
    # others cannot see, and the newest (or most detailed) copy of a shared post wins.
    $tenants = Get-M365TenantConfig -ConfigPath ./@build/config-m365.json -DefaultClientSecret (Get-DefaultGraphSecret)
    $merged = [ordered]@{}
    $sources = @{}
    $connectedTenants = 0
    $failedTenants = 0

    foreach($tenant in $tenants){
        if(-not $tenant.IsConfigured){
            $message = "Skipping tenant '$($tenant.Name)' because $($tenant.SkipReason)"
            if($tenant.Required){ throw $message }
            Write-Warning $message
            continue
        }

        try {
            Connect-M365Tenant $tenant
            $items = @(Get-M365MessageCenterItems)
            $summary = Add-M365MessageCenterItems -Map $merged -Items $items -TenantName $tenant.Name -Sources $sources -TenantType $tenant.Type
            $connectedTenants++
            Write-Host "Tenant '$($tenant.Name)' returned $($items.Count) items ($($summary.Added) new, $($summary.Replaced) updated, $($summary.Ignored) already current)"
        }
        catch {
            $message = "Tenant '$($tenant.Name)' could not be refreshed: $(Get-M365SafeErrorMessage -Tenant $tenant -ErrorRecord $_)"
            if($tenant.Required){ throw $message }
            Write-Warning $message
            $failedTenants++
        }
        finally {
            Disconnect-M365Tenant
        }
    }

    if($connectedTenants -eq 0){
        throw "No Microsoft Graph tenant could be refreshed."
    }

    $seenOnlyIn = Set-M365SeenOnlyIn -Map $merged -Sources $sources
    Write-Host "$seenOnlyIn items were only seen in one kind of tenant"

    # A tenant that could not be refreshed must not change what the site shows,
    # so the posts only it can see stay as the previous refresh left them. The
    # next refresh in which every tenant answers builds the list from scratch.
    $keptIds = [System.Collections.Generic.HashSet[string]]::new()
    if($failedTenants -gt 0){
        $restored = Restore-M365UnrefreshedItems -Map $merged -PreviousItems $PreviousItems
        $keptIds = $restored.KeptIds
        Write-Host "$failedTenants tenant(s) could not be refreshed: kept $($keptIds.Count) posts from the previous refresh and ignored $($restored.Unmarked) new single-kind marks"
    }

    return [pscustomobject]@{
        Items   = @(Get-SortedMessageCenterItems -Map $merged)
        KeptIds = $keptIds
    }
}
function Get-RoadmapRssItems() {
    Write-Host "Getting Microsoft 365 Roadmap RSS items"
    $curlCommand = Get-Command curl -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($curlCommand) {
        $content = & $curlCommand.Source -L -s "https://www.microsoft.com/en-us/microsoft-365/RoadmapFeatureRSS"
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to fetch Microsoft 365 Roadmap RSS feed."
        }
    }
    else {
        $content = (Invoke-WebRequest -Uri "https://www.microsoft.com/en-us/microsoft-365/RoadmapFeatureRSS").Content
    }

    $xmlContent = ($content -join "`n").TrimStart([char]0xFEFF)
    $rss = New-Object System.Xml.XmlDocument
    $rss.LoadXml($xmlContent)
    return $rss.rss.channel.item
}

function ConvertTo-PlainText([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }

    $decoded = [System.Net.WebUtility]::HtmlDecode($value)
    $decoded = $decoded -replace '<br\s*/?>', "`n"
    $decoded = $decoded -replace '</p>', "`n"
    $decoded = $decoded -replace '<[^>]+>', ''
    $decoded = $decoded -replace "`r", ''
    $lines = $decoded -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

    return ($lines -join "`n`n")
}

function ConvertTo-RoadmapHtml([string]$value) {
    $markdown = ConvertTo-PlainText $value
    $lines = $markdown -split "`n`n"
    $htmlParts = New-Object System.Collections.Generic.List[string]

    foreach ($line in $lines) {
        $escaped = [System.Net.WebUtility]::HtmlEncode($line)
        if ($line -match '^(GA date|Preview date|More info):\s*(.+)$') {
            $label = [System.Net.WebUtility]::HtmlEncode($matches[1])
            $content = [System.Net.WebUtility]::HtmlEncode($matches[2])
            $htmlParts.Add("<p><b>${label}:</b> $content</p>")
        }
        else {
            $htmlParts.Add("<p>$escaped</p>")
        }
    }

    return ($htmlParts -join "`n")
}

function Join-CategoryValues([array]$values) {
    return (($values | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique) -join ", ")
}

function Limit-Text([string]$value, [int]$maxLength = 500) {
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }

    $clean = ($value -replace '\s+', ' ').Trim()
    if ($clean.Length -le $maxLength) {
        return $clean
    }

    return $clean.Substring(0, $maxLength).Trim() + "..."
}

function Get-MessageSummaryText($item) {
    $summary = @($item.Details | Where-Object { $_.Name -eq "Summary" } | Select-Object -First 1).Value

    if ([string]::IsNullOrWhiteSpace($summary) -and $item.Body.Markdown) {
        $summary = $item.Body.Markdown
    }

    if ([string]::IsNullOrWhiteSpace($summary) -and $item.Body.Content) {
        $summary = ConvertTo-PlainText $item.Body.Content
    }

    return Limit-Text $summary
}

function ConvertTo-RssText([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }

    return [System.Security.SecurityElement]::Escape($value)
}

function New-RssItem($item) {
    $source = switch ($item.Source) {
        "roadmap" { "Microsoft 365 Roadmap" }
        "azure" { "Azure Updates" }
        default { "Message Center" }
    }
    # An older Azure update's id is a long slug that repeats its title.
    $title = if ($item.Id -like "AZ-*") { $item.Title } else { "$($item.Id): $($item.Title)" }
    $url = "https://mc.merill.net/message/$($item.Id)"
    $lastModified = Get-M365MessageTimestamp $item
    $summary = Get-MessageSummaryText $item
    $services = @($item.Services | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $categories = @($source) + $services

    $categoryXml = ($categories | Sort-Object -Unique | ForEach-Object { "    <category>$(ConvertTo-RssText $_)</category>" }) -join "`n"

    return @"
  <item>
    <title>$(ConvertTo-RssText $title)</title>
    <link>$(ConvertTo-RssText $url)</link>
    <guid isPermaLink="true">$(ConvertTo-RssText $url)</guid>
    <pubDate>$($lastModified.UtcDateTime.ToString("r"))</pubDate>
    <description>$(ConvertTo-RssText $summary)</description>
$categoryXml
  </item>
"@
}

function New-MessageIndexRecord($item) {
    $source = if ($item.Source -eq "roadmap") { "roadmap" } else { "messageCenter" }

    $record = [ordered]@{
        Id = $item.Id
        Title = $item.Title
        Source = $source
        Url = "https://mc.merill.net/message/$($item.Id)"
        Services = @($item.Services)
        StartDateTime = $item.StartDateTime
        EndDateTime = $item.EndDateTime
        LastModifiedDateTime = $item.LastModifiedDateTime
        IsMajorChange = $item.IsMajorChange
        Category = $item.Category
        Tags = @($item.Tags)
        Summary = Get-MessageSummaryText $item
    }

    # Only present on posts that a single kind of tenant (such as EDU) returned.
    if ($item.SeenOnlyIn) { $record['SeenOnlyIn'] = $item.SeenOnlyIn }

    return $record
}

function ConvertTo-RoadmapMessage($item) {
    $categories = @($item.category | ForEach-Object { [string]$_ })
    $statusValues = @("In development", "Rolling out", "Launched", "Cancelled", "Postponed", "Modified")
    $releaseValues = @("General Availability", "Preview", "Targeted Release", "Current Channel", "Monthly Enterprise Channel", "Semi-Annual Enterprise Channel")
    $cloudValues = @("Worldwide (Standard Multi-Tenant)", "GCC", "GCC High", "DoD")
    $platformValues = @("Android", "Desktop", "iOS", "Linux", "Mac", "Teams and Surface Devices", "Web")

    $status = @($categories | Where-Object { $statusValues -contains $_ })
    $release = @($categories | Where-Object { $releaseValues -contains $_ })
    $clouds = @($categories | Where-Object { $cloudValues -contains $_ })
    $platforms = @($categories | Where-Object { $platformValues -contains $_ })
    $services = @($categories | Where-Object {
        ($statusValues -notcontains $_) -and
        ($releaseValues -notcontains $_) -and
        ($cloudValues -notcontains $_) -and
        ($platformValues -notcontains $_)
    })

    $sourceId = [string]$item.guid.'#text'
    if ([string]::IsNullOrWhiteSpace($sourceId)) {
        $sourceId = [string]$item.guid
    }

    $description = [string]$item.description
    $markdown = ConvertTo-PlainText $description
    $html = ConvertTo-RoadmapHtml $description
    $pubDate = ([datetimeoffset]::Parse([string]$item.pubDate)).UtcDateTime.ToString("o")
    $updatedNode = $item.SelectSingleNode("*[local-name()='updated']")
    $updated = if ($updatedNode) { ([datetimeoffset]::Parse($updatedNode.InnerText)).UtcDateTime.ToString("o") } else { $pubDate }
    $link = [string]$item.link

    return [pscustomobject]@{
        ActionRequiredByDateTime = $null
        Attachments = $null
        AttachmentsArchive = $null
        Body = [pscustomobject]@{
            Content = $html
            ContentType = "html"
            Markdown = $markdown
        }
        Category = "roadmap"
        Details = @(
            [pscustomobject]@{ Name = "RoadmapIds"; Value = $sourceId },
            [pscustomobject]@{ Name = "SourceId"; Value = $sourceId },
            [pscustomobject]@{ Name = "RoadmapLink"; Value = $link },
            [pscustomobject]@{ Name = "Summary"; Value = (($markdown -split "`n`n")[0]) },
            [pscustomobject]@{ Name = "Status"; Value = (Join-CategoryValues $status) },
            [pscustomobject]@{ Name = "ReleasePhase"; Value = (Join-CategoryValues $release) },
            [pscustomobject]@{ Name = "CloudInstances"; Value = (Join-CategoryValues $clouds) },
            [pscustomobject]@{ Name = "Platforms"; Value = (Join-CategoryValues $platforms) }
        )
        EndDateTime = $null
        HasAttachments = $false
        Id = "RM$sourceId"
        IsMajorChange = $false
        LastModifiedDateTime = $updated
        Services = @($services)
        Severity = "normal"
        Source = "roadmap"
        StartDateTime = $pubDate
        Tags = @($status + $release + $clouds)
        Title = ([string]$item.title).Trim()
        ViewPoint = [pscustomobject]@{
            IsArchived = $null
            IsFavorited = $null
            IsRead = $null
        }
        AdditionalProperties = [pscustomobject]@{}
    }
}

$dataPath = "./@data"
$discordOutboxPath = "$dataPath/discord-outbox.json"
$previousMessages = @()
$hasPreviousMessageSnapshot = Test-Path "$dataPath/messages.json"

if ($hasPreviousMessageSnapshot) {
    # Dates are read as text so a post kept from this snapshot is written back unchanged.
    $previousMessages = @(Get-Content "$dataPath/messages.json" -Raw | ConvertFrom-Json -DateKind String)
}
$previousMessageIds = @($previousMessages | Select-Object -ExpandProperty Id)

if(-not $RoadmapOnly){
    $refresh = Get-AllTenantMessageCenterItems $previousMessages
    $msgItems = $refresh.Items

    Write-Host "Updating Message Center data with $($msgItems.Count) items"
    foreach($msg in $msgItems){
        # A post kept from the previous refresh is already in its stored form.
        if($refresh.KeptIds.Contains([string]$msg.Id)){ continue }

        $msg.Title = $msg.Title.Replace('(Updated) ', '')
        $msg.body.content = $msg.body.content -replace '\[(.*?)\]', '<b>$1</b>'
        $msg | Add-Member -NotePropertyName Source -NotePropertyValue "messageCenter" -Force

        # Save each message for version history
        $msg | ConvertTo-Json -Depth 10 | Set-Content -Path ("$($dataPath)/archive/$($msg.Id).json")
    }

    # Only queue genuinely new Message Center posts whose service/product or
    # title contains the standalone word "Entra" (case-insensitive).
    # An empty previous snapshot establishes a baseline instead of backfilling every post.
    # Posts that a newly added tenant makes visible for the first time are only
    # announced when they were published within the last $NewPostMaxAgeDays days.
    $newEntraMessages = if ($hasPreviousMessageSnapshot) {
        @($msgItems | Where-Object {
            ($previousMessageIds -notcontains $_.Id) -and
            (Test-IsEntraMessageCenterItem $_) -and
            (Test-IsRecentMessageCenterItem $_ -MaxAgeDays $NewPostMaxAgeDays)
        })
    }
    else {
        @()
    }
    $discordOutbox = @($newEntraMessages | ForEach-Object { New-MessageIndexRecord $_ })
    ConvertTo-Json -InputObject $discordOutbox -Depth 6 | Set-Content -Path $discordOutboxPath
    Write-Host "Queued $($discordOutbox.Count) new Microsoft Entra Message Center post(s) for Discord"

    $msgitems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/messages.json")
    $msgitems.Services | Sort-Object | Get-Unique | ConvertTo-Json | Set-Content -Path ($dataPath + "/services.json")
}
else {
    Write-Host "Skipping Message Center update because -RoadmapOnly was supplied"
    ConvertTo-Json -InputObject @() | Set-Content -Path $discordOutboxPath
}

$roadmapItems = Get-RoadmapRssItems | ForEach-Object { ConvertTo-RoadmapMessage $_ }
Write-Host "Updating roadmap data with $($roadmapItems.Count) items"
$roadmapItems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/roadmap.json")

# Azure updates come from a public API, so they need no tenant. The script
# keeps one file per update under @data/azure and writes the two lists read
# here: the updates changed in the last year as full posts, and an index record
# for every update.
Write-Host "Getting Azure updates"
node ./scripts/update-azure.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Azure updates were not refreshed; continuing with the copies already stored"
}
$azureItems = @()
$azureIndexRecords = @()
if (Test-Path "$dataPath/azure.json") {
    $azureItems = @(Get-Content "$dataPath/azure.json" -Raw | ConvertFrom-Json)
}
if (Test-Path "$dataPath/azure-index.json") {
    $azureIndexRecords = @(Get-Content "$dataPath/azure-index.json" -Raw | ConvertFrom-Json)
}
Write-Host "Loaded $($azureIndexRecords.Count) Azure updates, $($azureItems.Count) of them changed in the last year"

Write-Host "Building messages-archive.json from archive folder"
$activeMessages = Get-Content ($dataPath + "/messages.json") | ConvertFrom-Json
$activeIds = $activeMessages | Select-Object -ExpandProperty Id
$archiveFields = @('Id','Title','Services','StartDateTime','EndDateTime','LastModifiedDateTime','IsMajorChange','Category')
$archiveRecords = @(Get-ChildItem -Path "$($dataPath)/archive" -Filter "*.json" |
    Where-Object { $activeIds -notcontains $_.BaseName } |
    ForEach-Object {
        $item = Get-Content $_.FullName | ConvertFrom-Json
        $record = [ordered]@{}

        foreach ($field in $archiveFields) {
            $record[$field] = $item.$field
        }

        if ($item.SeenOnlyIn) { $record['SeenOnlyIn'] = $item.SeenOnlyIn }

        $record
    } |
    Sort-Object -Property LastModifiedDateTime -Descending)

# Azure updates that last changed over a year ago are listed here too, so the
# home page can load them after it has drawn. `Source` tells them apart from
# expired Message Center posts.
$recentAzureIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($item in $azureItems) { [void]$recentAzureIds.Add([string]$item.Id) }
$azureArchiveRecords = @($azureIndexRecords |
    Where-Object { -not $recentAzureIds.Contains([string]$_.Id) } |
    ForEach-Object {
        $record = [ordered]@{}

        foreach ($field in $archiveFields) {
            $record[$field] = $_.$field
        }

        $record['Source'] = 'azure'
        $record
    })
$archiveRecords = @($archiveRecords) + $azureArchiveRecords

ConvertTo-Json -InputObject $archiveRecords -Depth 5 -Compress | Set-Content -Path ($dataPath + "/messages-archive.json")
Copy-Item -Path ($dataPath + "/messages-archive.json") -Destination "./public/messages-archive.json" -Force
Write-Host "Wrote $($archiveRecords.Count) archive-only records to messages-archive.json ($($azureArchiveRecords.Count) Azure updates)"

$tableServices = @($activeMessages.Services) + @($roadmapItems.Services) + @($archiveRecords.Services) + @($azureItems.Services) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Sort-Object -Unique
ConvertTo-Json -InputObject $tableServices -Depth 3 -Compress | Set-Content -Path ($dataPath + "/table-services.json")
Write-Host "Wrote $($tableServices.Count) table services to table-services.json"

Write-Host "Building messages-index.json for AI and search consumers"
$messageIndexRecords = New-Object System.Collections.Generic.List[object]

foreach ($item in @($activeMessages)) {
    $messageIndexRecords.Add((New-MessageIndexRecord $item))
}

foreach ($item in @($roadmapItems)) {
    $messageIndexRecords.Add((New-MessageIndexRecord $item))
}

Get-ChildItem -Path "$($dataPath)/archive" -Filter "*.json" |
    Where-Object { $activeIds -notcontains $_.BaseName } |
    ForEach-Object {
        $item = Get-Content $_.FullName | ConvertFrom-Json
        $messageIndexRecords.Add((New-MessageIndexRecord $item))
    }

foreach ($record in $azureIndexRecords) {
    $messageIndexRecords.Add($record)
}

$sortedMessageIndexRecords = $messageIndexRecords.ToArray() | Sort-Object -Property @{ Expression = { Get-M365MessageTimestamp $_ }; Descending = $true }
ConvertTo-Json -InputObject $sortedMessageIndexRecords -Depth 6 -Compress | Set-Content -Path ($dataPath + "/messages-index.json")
Copy-Item -Path ($dataPath + "/messages-index.json") -Destination "./public/messages-index.json" -Force
Write-Host "Wrote $($sortedMessageIndexRecords.Count) records to messages-index.json"

Write-Host "Building RSS feeds for Message Center, Roadmap and Azure updates"
# Sort on the parsed timestamp, not its string form. Message Center records are
# read back through ConvertFrom-Json, which turns dates into [datetime] values
# that stringify as "09/14/2026 23:28:24", while Roadmap records keep ISO 8601
# strings. Comparing the strings would rank the items in the wrong order.
function Write-RssFeed($items, [string]$path, [string]$title, [string]$description, [string]$feedUrl) {
    $feedItems = @(@($items) |
        Sort-Object -Property @{ Expression = { Get-M365MessageTimestamp $_ }; Descending = $true } |
        Select-Object -First 500)
    $pubDate = if ($feedItems.Count -gt 0) {
        (Get-M365MessageTimestamp $feedItems[0]).UtcDateTime.ToString("r")
    }
    else {
        (Get-Date).ToUniversalTime().ToString("r")
    }
    $itemXml = ($feedItems | ForEach-Object { New-RssItem $_ }) -join "`n"
    $xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>$(ConvertTo-RssText $title)</title>
  <link>https://mc.merill.net/</link>
  <atom:link href="$feedUrl" rel="self" type="application/rss+xml" />
  <description>$(ConvertTo-RssText $description)</description>
  <language>en-us</language>
  <lastBuildDate>$pubDate</lastBuildDate>
  <ttl>60</ttl>
$itemXml
</channel>
</rss>
"@
    $xml | Set-Content -Path $path
    Write-Host "Wrote $($feedItems.Count) items to $path"
}

Write-RssFeed $activeMessages "./public/rss.xml" "Microsoft 365 Message Center Archive" "Latest Microsoft 365 Message Center messages. Message Center posts vary by tenant; always use your tenant's Message Center as the source of truth." "https://mc.merill.net/rss.xml"
Write-RssFeed $roadmapItems "./public/rss-roadmap.xml" "Microsoft 365 Roadmap Archive" "Latest Microsoft 365 Roadmap posts." "https://mc.merill.net/rss-roadmap.xml"
Write-RssFeed $azureItems "./public/rss-azure.xml" "Azure Updates Archive" "Latest Azure updates from azure.microsoft.com/updates." "https://mc.merill.net/rss-azure.xml"

Write-Host "Augmenting messages-index.json with cross-message references"
node ./scripts/build-references.mjs

Write-Host "Updating per-message version history under @data/history"
node ./scripts/update-history.mjs

Write-Host "Publishing changed version histories to the discussion service"
node ./scripts/publish-history.mjs

Write-Host "Publishing new Microsoft Entra Message Center posts to Discord"
node ./scripts/publish-discord.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Discord publisher did not complete successfully; queued messages remain in @data/discord-state.json"
}

Write-Host "Publishing changed index records to the discussion service"
node ./scripts/publish-zap.mjs

Write-Host "Completed updating"
