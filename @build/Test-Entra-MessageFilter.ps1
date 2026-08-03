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
