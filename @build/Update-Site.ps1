# Get the latest M365 Message Center items and update the site

param($GraphSecret)
function Connect-MicrosoftGraph(){
    $m365Config = Get-Content ./@build/secrets-m365.json | ConvertFrom-Json

    if(![string]::IsNullOrEmpty($GraphSecret)){ # If we are running in Github get the secret from the parameter
        $m365Config.clientSecret = $GraphSecret
    }

    [securestring]$secSecret = ConvertTo-SecureString $m365Config.clientSecret -AsPlainText -Force
    [pscredential]$cred = New-Object System.Management.Automation.PSCredential ($m365Config.clientId, $secSecret)
    Connect-MgGraph -TenantId $m365Config.tenantId -Credential $cred -NoWelcome
}
function Get-M365MessageCenterItems() {
    $mc = Get-MgServiceAnnouncementMessage -Top 999  -Sort "LastModifiedDateTime desc" -All
    return $mc
}

$dataPath = "./@data"

Connect-MicrosoftGraph
$msgItems = Get-M365MessageCenterItems

foreach($msg in $msgItems){
    $msg.Title = $msg.Title.Replace('(Updated) ', '')
    $msg.body.content = $msg.body.content -replace '\[(.*?)\]', '<b>$1</b>'

    # Save each message for version history
    $msg | ConvertTo-Json -Depth 10 | Set-Content -Path ("$($dataPath)/archive/$($msg.Id).json")
}

$msgitems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "/messages.json")
$msgitems.Services | Sort-Object | Get-Unique | ConvertTo-Json | Set-Content -Path ($dataPath + "/services.json")

Write-Host "Completed updating"
