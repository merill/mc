function Test-IsEntraMessageCenterItem {
    param(
        [Parameter(Mandatory = $true)]
        $Message
    )

    $entraPattern = '(?i)\bEntra\b'
    $serviceMatch = @($Message.Services | Where-Object {
        ([string]$_) -match $entraPattern
    }).Count -gt 0
    $titleMatch = ([string]$Message.Title) -match $entraPattern

    return $serviceMatch -or $titleMatch
}

function Test-IsRecentMessageCenterItem {
    <#
        Guards against a burst of Discord notifications when a new source tenant
        is added: posts that tenant makes visible for the first time are only
        announced when Microsoft actually published them recently.
    #>
    param(
        [Parameter(Mandatory = $true)]
        $Message,
        [int]$MaxAgeDays = 14,
        [datetimeoffset]$Now = [datetimeoffset]::UtcNow
    )

    $published = $Message.StartDateTime
    if (-not $published) { $published = $Message.LastModifiedDateTime }
    if (-not $published) { return $false }

    if ($published -is [datetimeoffset]) {
        $stamp = $published
    }
    elseif ($published -is [datetime]) {
        $stamp = [datetimeoffset]$published
    }
    else {
        try {
            $stamp = [datetimeoffset]::Parse([string]$published)
        }
        catch {
            return $false
        }
    }

    return $stamp -ge $Now.AddDays(-$MaxAgeDays)
}
