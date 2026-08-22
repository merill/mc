. "$PSScriptRoot/Entra-MessageFilter.ps1"

$cases = @(
    @{
        Name = 'exact Microsoft Entra service'
        Message = [pscustomobject]@{ Services = @('Microsoft Entra'); Title = 'New administrator capability' }
        Expected = $true
    },
    @{
        Name = 'future Entra service label'
        Message = [pscustomobject]@{ Services = @('Microsoft Entra ID'); Title = 'New administrator capability' }
        Expected = $true
    },
    @{
        Name = 'title-only Entra mention'
        Message = [pscustomobject]@{ Services = @('Microsoft Intune'); Title = 'Conditional Access changes in Microsoft Entra' }
        Expected = $true
    },
    @{
        Name = 'case-insensitive title mention'
        Message = [pscustomobject]@{ Services = @('Microsoft Teams'); Title = 'New ENTRA authentication support' }
        Expected = $true
    },
    @{
        Name = 'unrelated product and title'
        Message = [pscustomobject]@{ Services = @('Microsoft Teams'); Title = 'New meeting capability' }
        Expected = $false
    },
    @{
        Name = 'partial word is not a match'
        Message = [pscustomobject]@{ Services = @('Microsoft Teams'); Title = 'Entrapment policy guidance' }
        Expected = $false
    }
)

foreach ($case in $cases) {
    $actual = Test-IsEntraMessageCenterItem $case.Message
    if ($actual -ne $case.Expected) {
        throw "Failed '$($case.Name)': expected $($case.Expected), received $actual"
    }
}

Write-Host "Passed $($cases.Count) Entra Message Center filter cases"

$now = [datetimeoffset]::Parse('2026-08-22T00:00:00Z')
$recencyCases = @(
    @{
        Name = 'post published today'
        Message = [pscustomobject]@{ StartDateTime = '2026-08-22T06:00:00Z' }
        Expected = $true
    },
    @{
        Name = 'post published within the window'
        Message = [pscustomobject]@{ StartDateTime = '2026-08-10T00:00:00Z' }
        Expected = $true
    },
    @{
        Name = 'older post newly visible from another tenant'
        Message = [pscustomobject]@{ StartDateTime = '2026-05-01T00:00:00Z'; LastModifiedDateTime = '2026-08-21T00:00:00Z' }
        Expected = $false
    },
    @{
        Name = 'falls back to last modified when there is no start date'
        Message = [pscustomobject]@{ StartDateTime = $null; LastModifiedDateTime = '2026-08-20T00:00:00Z' }
        Expected = $true
    },
    @{
        Name = 'no usable date is never announced'
        Message = [pscustomobject]@{ StartDateTime = $null; LastModifiedDateTime = $null }
        Expected = $false
    }
)

foreach ($case in $recencyCases) {
    $actual = Test-IsRecentMessageCenterItem $case.Message -MaxAgeDays 14 -Now $now
    if ($actual -ne $case.Expected) {
        throw "Failed '$($case.Name)': expected $($case.Expected), received $actual"
    }
}

Write-Host "Passed $($recencyCases.Count) Message Center recency cases"
