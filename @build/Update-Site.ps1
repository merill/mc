# Get the latest M365 Message Center items and update the site

param($GraphSecret)
function Connect-McGraph(){
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

function Update-MessageJson($msg) {
    $msg | ConvertTo-Json -Depth 10 | Set-Content -Path ./data/$($msg.id).json
}

function Update-MessageMarkdown($msg, $template) {

    $frontMatterTitle = $msg.title -replace ':', ' -'

    $template = $template -replace '=id=', $msg.id
    $template = $template -replace '=title=', $frontMatterTitle
    $template = $template -replace '=front-matter-title=', $frontMatterTitle


    $datePublished = Get-DateString $msg.publishedDateTime
    $template = $template -replace '=date-published=', $datePublished

    $dateModified = Get-DateString $msg.LastModifiedDateTime
    $template = $template -replace '=LastModifiedDateTime=', $dateModified

    $dateEnd = Get-DateString $msg.EndDateTime
    $template = $template -replace '=EndDateTime=', $dateEnd

    $dateActBy = Get-DateString $msg.ActionRequiredByDateTime
    $template = $template -replace '=ActionRequiredByDateTime=', $dateActBy

    $dateStart = Get-DateString $msg.StartDateTime
    $template = $template -replace '=StartDateTime=', $dateStart

    $template = $template -replace '=Severity=', $msg.Severity
    $template = $template -replace '=Category=', $msg.Category
    $template = $template -replace '=IsMajorChange=', $msg.IsMajorChange
    $template = $template -replace '=Tags=', $msg.Tags

    $template = $template -replace '=Services=', $msg.Services

    $detailText = ""
    foreach($detail in $msg.Details){
        if($detail.Name -eq "FeatureStatusJson"){ continue }
        $detailText += "$($detail.Name)`n$($detail.Value)`n"
    }
    $template = $template -replace '=Details=', $detailText

    $content = $msg.body.content -replace '\[(.*?)\]', '<b>$1</b>'
    $content = $content -replace '`', '''' # Remove backticks so it can be included in html
    $template = $template -replace '=content=', $content

    # $formattedDetails = $msg.Details -replace "<p>[", "<p><b>"
    # $formattedDetails = $formattedDetails -replace "]`n</p>", "</b>`n</p>"

    $template | Set-Content -Path ./src/docs/reference/$($msg.id).mdx
}

function Get-DateString($date){
    if([string]::IsNullOrEmpty($date)){ return "" }
    return $date.ToString("MMM dd, yyyy")
}

Connect-McGraph
$msgItems = Get-M365MessageCenterItems

$template = Get-Content ./@build/templates/message.md

foreach($msg in $msgItems){
    $msg.Title = $msg.Title.Replace('(Updated) ', '')
    #Update-MessageJson $msg
    #Update-MessageMarkdown $msg $template
    #$date = Get-DateString $msg.LastModifiedDateTime
    #$rootMarkdown += "* [$($msg.id) - $($msg.title)]($($msg.id)) - $date" + [Environment]::NewLine

}
$dataPath = "./data/"
$msgitems | ConvertTo-Json -Depth 10 | Set-Content -Path ($dataPath + "messages.json")
$msgitems.Services | Sort-Object | Get-Unique | ConvertTo-Json | Set-Content -Path ($dataPath + "services.json")

Write-Host "Completed updating"
#$indexContent = Get-Content ./build/templates/index.md
#$indexContent = $indexContent -replace '=content=', $rootMarkdown
#$indexContent | Set-Content -Path ./src/site/src/content/docs/index.mdx