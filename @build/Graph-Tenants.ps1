# Multi-tenant Microsoft Graph helpers for the Message Center refresh.
#
# Message Center posts are tenant specific, so the archive is built from more
# than one tenant. Each tenant is described in @build/config-m365.json and can
# authenticate either with a client secret or with a GitHub Actions federated
# identity credential (workload identity federation, no secret to rotate).
#
# Contributor tenants are kept private. Their IDs come from a JSON list in an
# environment variable (a GitHub Actions secret), are masked in workflow logs,
# and their sign-in errors are reduced to error codes so a public workflow log
# never reveals which organizations contribute to the archive.

$script:DefaultFederatedAudience = 'api://AzureADTokenExchange'
$script:GraphScope = 'https://graph.microsoft.com/.default'
# Kinds of tenant a config entry or contributor can declare with `type`.
$script:KnownTenantTypes = @('edu')

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

function Register-M365LogMask {
    <#
        Asks GitHub Actions to redact a value from every later log line. GitHub
        only masks a secret's whole value, not the tenant IDs parsed out of a
        JSON secret, so each private ID is registered on its own.
    #>
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    if ($env:GITHUB_ACTIONS -ne 'true') { return }

    Write-Host "::add-mask::$($Value.Trim())"
}

function Resolve-M365TenantType {
    <#
        Normalizes a tenant's optional `type` to one of the known kinds of
        tenant, or $null for a standard commercial tenant. The value ends up in
        the public data as SeenOnlyIn, so anything unrecognized is dropped.
    #>
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }

    $type = $Value.Trim().ToLowerInvariant()
    if ($script:KnownTenantTypes -contains $type) { return $type }
    return $null
}

function Expand-M365TenantListEntries {
    <#
        Expands config entries that use `tenantListEnv` into one entry per
        tenant. The environment variable holds a JSON array of tenant IDs, or of
        objects with `tenantId`, an optional `clientId` (for a contributor who
        registered their own app), an optional anonymous `label` and an optional
        `type` (such as `edu`). Expanded
        tenants are always optional and private. An unset list expands to
        nothing so the refresh works before any contributor is added.
    #>
    param($Entries)

    foreach ($entry in @($Entries)) {
        if (-not ((Test-HasProperty $entry 'tenantListEnv') -and -not [string]::IsNullOrWhiteSpace($entry.tenantListEnv))) {
            $entry
            continue
        }

        $prefix = if ((Test-HasProperty $entry 'name') -and -not [string]::IsNullOrWhiteSpace($entry.name)) { [string]$entry.name } else { 'contributor' }
        $listJson = [System.Environment]::GetEnvironmentVariable([string]$entry.tenantListEnv)
        if ([string]::IsNullOrWhiteSpace($listJson)) { continue }

        $template = [ordered]@{}
        foreach ($property in $entry.PSObject.Properties) {
            if ($property.Name -notin @('tenantListEnv', 'tenantId', 'name')) {
                $template[$property.Name] = $property.Value
            }
        }
        $template['required'] = $false
        $template['private'] = $true

        try {
            $list = @($listJson | ConvertFrom-Json -ErrorAction Stop)
        }
        catch {
            # Never echo the list itself: it holds the private tenant IDs.
            $invalid = [ordered]@{} + $template
            $invalid['name'] = $prefix
            $invalid['listError'] = "$($entry.tenantListEnv) is not valid JSON"
            [pscustomobject]$invalid
            continue
        }

        $position = 0
        foreach ($item in $list) {
            $position++
            $expanded = [ordered]@{} + $template

            if ($item -is [string]) {
                $expanded['tenantId'] = $item
                $label = $null
            }
            else {
                $expanded['tenantId'] = [string]$item.tenantId
                if ((Test-HasProperty $item 'clientId') -and -not [string]::IsNullOrWhiteSpace($item.clientId)) {
                    $expanded['clientId'] = [string]$item.clientId
                }
                if (Test-HasProperty $item 'type') { $expanded['type'] = [string]$item.type }
                $label = if (Test-HasProperty $item 'label') { [string]$item.label } else { $null }
            }

            # Labels appear in public logs, so only short anonymous tokens are used.
            if ([string]::IsNullOrWhiteSpace($label) -or $label -notmatch '^[A-Za-z0-9_-]{1,24}$') {
                $label = '{0:D2}' -f $position
            }

            $expanded['name'] = "$prefix-$label"
            [pscustomobject]$expanded
        }
    }
}

function Get-M365SafeErrorMessage {
    <#
        Returns an error message that is safe for a public workflow log. Entra
        sign-in errors can name the tenant's organization, so for private
        tenants only the AADSTS codes and HTTP status are kept.
    #>
    param(
        [Parameter(Mandatory = $true)]$Tenant,
        [Parameter(Mandatory = $true)]$ErrorRecord
    )

    $message = if ($ErrorRecord -is [System.Management.Automation.ErrorRecord]) {
        $details = if ($ErrorRecord.ErrorDetails) { [string]$ErrorRecord.ErrorDetails.Message } else { '' }
        "$($ErrorRecord.Exception.Message) $details".Trim()
    }
    else {
        [string]$ErrorRecord
    }

    if (-not $Tenant.Private) { return $message }

    $codes = @([regex]::Matches($message, 'AADSTS\d+') | ForEach-Object { $_.Value } | Select-Object -Unique)
    $status = $null
    if ($ErrorRecord -is [System.Management.Automation.ErrorRecord] -and $ErrorRecord.Exception.PSObject.Properties['Response'] -and $ErrorRecord.Exception.Response) {
        $status = [int]$ErrorRecord.Exception.Response.StatusCode
    }

    $parts = @()
    if ($codes.Count -gt 0) { $parts += ($codes -join ', ') }
    if ($status) { $parts += "HTTP $status" }
    if ($parts.Count -eq 0) { $parts += 'request failed' }

    return "$($parts -join ', ') (details hidden for contributor tenants)"
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

    foreach ($entry in (Expand-M365TenantListEntries $entries)) {
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
        $isPrivate = (Test-HasProperty $entry 'private') -and [bool]$entry.private
        $type = if (Test-HasProperty $entry 'type') { Resolve-M365TenantType ([string]$entry.type) } else { $null }

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

        if ($isPrivate) {
            Register-M365LogMask $tenantId
            Register-M365LogMask $clientId
        }

        $skipReason = $null
        if ((Test-HasProperty $entry 'listError') -and $entry.listError) {
            $skipReason = [string]$entry.listError
        }
        elseif ([string]::IsNullOrWhiteSpace($tenantId)) {
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
            Private      = $isPrivate
            Type         = $type
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
        throw "Microsoft Entra did not return an access token."
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

        When $Sources (a hashtable keyed by message ID) is supplied, it records
        the kinds of tenant that returned each post, for Set-M365SeenOnlyIn.
    #>
    param(
        [Parameter(Mandatory = $true)]$Map,
        $Items,
        [string]$TenantName,
        $Sources,
        [string]$TenantType
    )

    $added = 0
    $replaced = 0
    $ignored = 0

    foreach ($item in @($Items)) {
        $id = [string]$item.Id
        if ([string]::IsNullOrWhiteSpace($id)) { continue }

        if ($null -ne $Sources) {
            # A standard commercial tenant is recorded as an empty type.
            if (-not $Sources.ContainsKey($id)) { $Sources[$id] = @{} }
            $Sources[$id][[string]$TenantType] = $true
        }

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

function Set-M365SeenOnlyIn {
    <#
        Marks the posts that only one kind of tenant returned (for example only
        education tenants) with a SeenOnlyIn property. Posts that a standard
        tenant, or more than one kind of tenant, returned are left unmarked.
    #>
    param(
        [Parameter(Mandatory = $true)]$Map,
        [Parameter(Mandatory = $true)]$Sources
    )

    $marked = 0
    foreach ($id in @($Map.Keys)) {
        $types = @($Sources[$id].Keys)
        if ($types.Count -ne 1 -or [string]::IsNullOrWhiteSpace($types[0])) { continue }

        $Map[$id] | Add-Member -NotePropertyName SeenOnlyIn -NotePropertyValue ([string]$types[0]) -Force
        $marked++
    }

    return $marked
}

function Test-M365MessageIsCurrent {
    <#
        True while a post has not reached its own end date. A post without a
        readable end date is not current, because nothing would ever end it.
    #>
    param($Message, [datetimeoffset]$Now = [datetimeoffset]::UtcNow)

    $value = $Message.EndDateTime
    if (-not $value) { return $false }
    if ($value -is [datetime]) { return ([datetimeoffset]$value) -gt $Now }
    if ($value -is [datetimeoffset]) { return $value -gt $Now }

    try {
        return [datetimeoffset]::Parse([string]$value) -gt $Now
    }
    catch {
        return $false
    }
}

function Restore-M365UnrefreshedItems {
    <#
        Keeps a refresh that some tenants missed from changing what the site
        shows. When a tenant cannot be refreshed, the posts only it can see are
        missing from $Map, and the site would list them as expired until the
        tenant answers again. This puts back the posts from the previous
        refresh that no tenant returned this time.

        A post is not put back once it has passed its own end date, so a tenant
        that never recovers cannot keep its posts current forever.

        A missing tenant can also make a post look as if only one kind of
        tenant sees it, so a post the previous refresh left unmarked stays
        unmarked.

        Returns the IDs that were put back and how many marks were removed.
    #>
    param(
        [Parameter(Mandatory = $true)]$Map,
        $PreviousItems,
        [datetimeoffset]$Now = [datetimeoffset]::UtcNow
    )

    $keptIds = [System.Collections.Generic.HashSet[string]]::new()
    $unmarked = 0

    foreach ($previous in @($PreviousItems)) {
        $id = [string]$previous.Id
        if ([string]::IsNullOrWhiteSpace($id)) { continue }

        if ($Map.Contains($id)) {
            $current = $Map[$id]
            if ($current.SeenOnlyIn -and -not $previous.SeenOnlyIn) {
                $current.PSObject.Properties.Remove('SeenOnlyIn')
                $unmarked++
            }
            continue
        }

        if (Test-M365MessageIsCurrent $previous -Now $Now) {
            $Map[$id] = $previous
            [void]$keptIds.Add($id)
        }
    }

    return [pscustomobject]@{
        KeptIds  = $keptIds
        Unmarked = $unmarked
    }
}

function Get-SortedMessageCenterItems {
    param([Parameter(Mandatory = $true)]$Map)

    return @($Map.Values) | Sort-Object -Property @{ Expression = { Get-M365MessageTimestamp $_ }; Descending = $true }
}
