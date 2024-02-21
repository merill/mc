# Get the latest M365 Message Center items and update the site

param($GraphSecret)
function Connect-McGraph(){
    $m365Config = Get-Content ./build/secrets-m365.json | ConvertFrom-Json

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
    $template = $template -replace '=date-updated=', $msg.publishedDateTime
    $template = $template -replace '=content=', $msg.body.content
    $template | Set-Content -Path ./src/site/src/content/docs/reference/$($msg.id).md
}

function Get-DateString($date){
    return $date.ToString("yyyy-MMM-dd")
}
Connect-McGraph
$msgItems = Get-M365MessageCenterItems

$template = Get-Content ./build/templates/message.md

$rootMarkdown = ""

foreach($msg in $msgItems){
    Update-MessageJson $msg
    Update-MessageMarkdown $msg $template
    $date = Get-DateString $msg.LastModifiedDateTime
    $rootMarkdown += "* [$($msg.id) - $($msg.title)]($($msg.id)) - $date" + [Environment]::NewLine
}

$indexContent = Get-Content ./build/templates/index.md
$indexContent = $indexContent -replace '=content=', $rootMarkdown
$indexContent | Set-Content -Path ./src/site/src/content/docs/index.mdx