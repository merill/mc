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
