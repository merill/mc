# Get the latest M365 Message Center and Microsoft 365 Roadmap items and update the site
#
# Default behavior:
# - Connects to Microsoft Graph and refreshes Message Center data.
# - Imports the Microsoft 365 Roadmap RSS feed.
#
# Use -RoadmapOnly to refresh only the Roadmap RSS feed during local development.

param($GraphSecret, [switch]$RoadmapOnly)
function Connect-MicrosoftGraph(){
    $m365Config = Get-Content ./@build/config-m365.json | ConvertFrom-Json

    $secret = $GraphSecret
    if([string]::IsNullOrEmpty($GraphSecret)){ # If we are running in Github get the secret from the parameter
        Write-Host "-GraphSecret not supplied"
        $secret = Get-Content ./@build/secrets-m365.json | ConvertFrom-Json
    }

    [securestring]$secSecret = ConvertTo-SecureString $secret -AsPlainText -Force
    [pscredential]$cred = New-Object System.Management.Automation.PSCredential ($m365Config.clientId, $secSecret)
    Write-Host "Connecting to Microsoft Graph"
    Connect-MgGraph -TenantId $m365Config.tenantId -Credential $cred -NoWelcome
}
function Get-M365MessageCenterItems() {
    Write-Host "Getting Message Center items"
    $mc = Get-MgServiceAnnouncementMessage -Top 999  -Sort "LastModifiedDateTime desc" -All
    return $mc
}
function Get-RoadmapRssItems() {
    Write-Host "Getting Microsoft 365 Roadmap RSS items"
    $curlCommand = Get-Command curl -CommandType Application -ErrorAction SilentlyContinue
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

if(-not $RoadmapOnly){
    Connect-MicrosoftGraph
    $msgItems = Get-M365MessageCenterItems

    Write-Host "Updating Message Center data with $($msgItems.Count) items"
    foreach($msg in $msgItems){
        $msg.Title = $msg.Title.Replace('(Updated) ', '')
        $msg.body.content = $msg.body.content -replace '\[(.*?)\]', '<b>$1</b>'
        $msg | Add-Member -NotePropertyName Source -NotePropertyValue "messageCenter" -Force

        # Save each message for version history
        $msg | ConvertTo-Json -Depth 10 | Set-Content -Path ("$($dataPath)/archive/$($msg.Id).json")
    }

    $msgitems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/messages.json")
    $msgitems.Services | Sort-Object | Get-Unique | ConvertTo-Json | Set-Content -Path ($dataPath + "/services.json")
}
else {
    Write-Host "Skipping Message Center update because -RoadmapOnly was supplied"
}

$roadmapItems = Get-RoadmapRssItems | ForEach-Object { ConvertTo-RoadmapMessage $_ }
Write-Host "Updating roadmap data with $($roadmapItems.Count) items"
$roadmapItems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/roadmap.json")

Write-Host "Completed updating"
