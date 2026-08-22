# Multi-tenant Microsoft Graph helpers for the Message Center refresh.
#
# Message Center posts are tenant specific, so the archive is built from more
# than one tenant. Each tenant is described in @build/config-m365.json and can
# authenticate either with a client secret or with a GitHub Actions federated
# identity credential (workload identity federation, no secret to rotate).

$script:DefaultFederatedAudience = 'api://AzureADTokenExchange'
$script:GraphScope = 'https://graph.microsoft.com/.default'

function Test-HasProperty {
    param($InputObject, [string]$Name)

    if ($null -eq $InputObject) { return $false }
    return @($InputObject.PSObject.Properties.Name) -contains $Name
}

function Resolve-M365ConfigValue {
    <#
        Returns the literal value, or the contents of the referenced environment
        variable when the value uses the ${ENV_VAR} placeholder syntax. Returns
        $null when the value is empty or the environment variable is not set, so
        callers can decide whether the tenant is optional.
    #>
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }

    $trimmed = $Value.Trim()
    $match = [regex]::Match($trimmed, '^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$')
    if (-not $match.Success) { return $trimmed }

    $envValue = [System.Environment]::GetEnvironmentVariable($match.Groups[1].Value)
    if ([string]::IsNullOrWhiteSpace($envValue)) { return $null }

    return $envValue.Trim()
}

function Get-M365TenantConfig {
    <#
        Reads @build/config-m365.json and returns one normalized object per
        tenant. The legacy single tenant shape (top level tenantId/clientId) is
        still supported. Tenants that are missing configuration are returned
        with IsConfigured = $false and a SkipReason instead of throwing, so an
        optional tenant never breaks the daily refresh.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$ConfigPath,
        [string]$DefaultClientSecret
    )

    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

    $entries = if ((Test-HasProperty $config 'tenants') -and $config.tenants) {
        @($config.tenants)
    }
    else {
        @($config) # legacy single tenant configuration file
    }

    $tenants = New-Object System.Collections.Generic.List[object]
    $index = 0

    foreach ($entry in $entries) {
        $index++

        $name = if ((Test-HasProperty $entry 'name') -and -not [string]::IsNullOrWhiteSpace($entry.name)) {
            [string]$entry.name
        }
        else {
            "tenant$index"
        }

        $auth = if ((Test-HasProperty $entry 'auth') -and -not [string]::IsNullOrWhiteSpace($entry.auth)) {
            [string]$entry.auth
        }
        else {
            'clientSecret'
        }

        if ($auth -match '^(?i)federated(Identity)?$') {
            $auth = 'federatedIdentity'
        }
        elseif ($auth -match '^(?i)clientSecret$') {
            $auth = 'clientSecret'
        }

        $required = if (Test-HasProperty $entry 'required') { [bool]$entry.required } else { $index -eq 1 }

        $audience = if ((Test-HasProperty $entry 'audience') -and -not [string]::IsNullOrWhiteSpace($entry.audience)) {
            [string]$entry.audience
        }
        else {
            $script:DefaultFederatedAudience
        }

        $tenantId = Resolve-M365ConfigValue ([string]$entry.tenantId)
        $clientId = Resolve-M365ConfigValue ([string]$entry.clientId)

        $clientSecret = $null
        if ($auth -eq 'clientSecret') {
            $clientSecret = if ((Test-HasProperty $entry 'secretEnv') -and -not [string]::IsNullOrWhiteSpace($entry.secretEnv)) {
                [System.Environment]::GetEnvironmentVariable([string]$entry.secretEnv)
            }
            else {
                $DefaultClientSecret
            }
        }

        $skipReason = $null
        if ([string]::IsNullOrWhiteSpace($tenantId)) {
            $skipReason = "tenantId is not configured"
        }
        elseif ([string]::IsNullOrWhiteSpace($clientId)) {
            $skipReason = "clientId is not configured"
        }
        elseif ($auth -eq 'clientSecret' -and [string]::IsNullOrWhiteSpace($clientSecret)) {
            $skipReason = "no client secret was supplied"
        }
        elseif ($auth -ne 'clientSecret' -and $auth -ne 'federatedIdentity') {
            $skipReason = "unsupported auth value '$auth'"
        }

        $tenants.Add([pscustomobject]@{
            Name         = $name
            TenantId     = $tenantId
            ClientId     = $clientId
            Auth         = $auth
            Audience     = $audience
            ClientSecret = $clientSecret
            Required     = $required
            IsConfigured = ($null -eq $skipReason)
            SkipReason   = $skipReason
        })
    }

    return $tenants.ToArray()
}

function Get-GitHubFederatedAssertion {
    <#
        Requests a GitHub Actions OIDC token to use as the client assertion.
        Requires the workflow to grant `permissions: id-token: write`.
    #>
    param([string]$Audience = $script:DefaultFederatedAudience)

    $requestUrl = $env:ACTIONS_ID_TOKEN_REQUEST_URL
    $requestToken = $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN

    if ([string]::IsNullOrWhiteSpace($requestUrl) -or [string]::IsNullOrWhiteSpace($requestToken)) {
        throw "GitHub OIDC token endpoint is unavailable. Run this from GitHub Actions with 'permissions: id-token: write'."
    }

    $uri = "$requestUrl&audience=$([uri]::EscapeDataString($Audience))"
    $response = Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $requestToken" }

    if ([string]::IsNullOrWhiteSpace($response.value)) {
        throw "GitHub OIDC token endpoint did not return a token."
    }

    return [string]$response.value
}

function Get-GraphAccessTokenFromAssertion {
    <#
        Exchanges a federated identity assertion for a Microsoft Graph app-only
        access token and returns it as a SecureString for Connect-MgGraph.
    #>
    param(
        [Parameter(Mandatory = $true)][string]$TenantId,
        [Parameter(Mandatory = $true)][string]$ClientId,
        [Parameter(Mandatory = $true)][string]$Assertion
    )

    $body = @{
        client_id             = $ClientId
        scope                 = $script:GraphScope
        grant_type            = 'client_credentials'
        client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
        client_assertion      = $Assertion
    }

    $response = Invoke-RestMethod -Method Post `
        -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $body

    if ([string]::IsNullOrWhiteSpace($response.access_token)) {
        throw "Microsoft Entra did not return an access token for tenant $TenantId."
    }

    return (ConvertTo-SecureString ([string]$response.access_token) -AsPlainText -Force)
}

function Connect-M365Tenant {
    param([Parameter(Mandatory = $true)]$Tenant)

    Write-Host "Connecting to Microsoft Graph tenant '$($Tenant.Name)' using $($Tenant.Auth)"

    if ($Tenant.Auth -eq 'federatedIdentity') {
        $assertion = Get-GitHubFederatedAssertion -Audience $Tenant.Audience
        $accessToken = Get-GraphAccessTokenFromAssertion -TenantId $Tenant.TenantId -ClientId $Tenant.ClientId -Assertion $assertion
        Connect-MgGraph -AccessToken $accessToken -NoWelcome
        return
    }

    [securestring]$secSecret = ConvertTo-SecureString $Tenant.ClientSecret -AsPlainText -Force
    [pscredential]$cred = New-Object System.Management.Automation.PSCredential ($Tenant.ClientId, $secSecret)
    Connect-MgGraph -TenantId $Tenant.TenantId -Credential $cred -NoWelcome
}

function Disconnect-M365Tenant {
    try {
        Disconnect-MgGraph -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
        Write-Verbose "Disconnect-MgGraph failed: $($_.Exception.Message)"
    }
}

function Get-M365MessageTimestamp {
    param($Message)

    $value = $Message.LastModifiedDateTime
    if (-not $value) { $value = $Message.StartDateTime }
    if (-not $value) { return [datetimeoffset]::MinValue }
    if ($value -is [datetime]) { return [datetimeoffset]$value }
    if ($value -is [datetimeoffset]) { return $value }

    try {
        return [datetimeoffset]::Parse([string]$value)
    }
    catch {
        return [datetimeoffset]::MinValue
    }
}

function Get-M365MessageDetailLength {
    <#
        Rough measure of how much information a copy of a post carries. Tenants
        with different licensing sometimes receive a longer body for the same
        Message Center ID, so the richer copy wins ties.
    #>
    param($Message)

    $length = 0
    if ($Message.Body) {
        $length += ([string]$Message.Body.Content).Length
        $length += ([string]$Message.Body.Markdown).Length
    }

    return $length
}

function Add-M365MessageCenterItems {
    <#
        Merges one tenant's Message Center posts into $Map (an ordered
        dictionary keyed by message ID). The newest copy of a post wins; when
        two tenants report the same LastModifiedDateTime the copy with the most
        content wins. Returns a small summary for logging.
    #>
    param(
        [Parameter(Mandatory = $true)]$Map,
        $Items,
        [string]$TenantName
    )

    $added = 0
    $replaced = 0
    $ignored = 0

    foreach ($item in @($Items)) {
        $id = [string]$item.Id
        if ([string]::IsNullOrWhiteSpace($id)) { continue }

        if (-not $Map.Contains($id)) {
            $Map[$id] = $item
            $added++
            continue
        }

        $existing = $Map[$id]
        $existingStamp = Get-M365MessageTimestamp $existing
        $incomingStamp = Get-M365MessageTimestamp $item

        $isNewer = $incomingStamp -gt $existingStamp
        $isRicher = ($incomingStamp -eq $existingStamp) -and
            ((Get-M365MessageDetailLength $item) -gt (Get-M365MessageDetailLength $existing))

        if ($isNewer -or $isRicher) {
            $Map[$id] = $item
            $replaced++
        }
        else {
            $ignored++
        }
    }

    return [pscustomobject]@{
        Tenant   = $TenantName
        Added    = $added
        Replaced = $replaced
        Ignored  = $ignored
    }
}

function Get-SortedMessageCenterItems {
    param([Parameter(Mandatory = $true)]$Map)

    return @($Map.Values) | Sort-Object -Property @{ Expression = { Get-M365MessageTimestamp $_ }; Descending = $true }
}
