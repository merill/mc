. "$PSScriptRoot/Graph-Tenants.ps1"

$failures = 0
$assertions = 0

function Assert-Equal {
    param($Expected, $Actual, [string]$Name)

    $script:assertions++
    if ($Expected -ne $Actual) {
        $script:failures++
        Write-Host "FAIL '$Name': expected '$Expected', received '$Actual'"
    }
}

$tempConfig = Join-Path ([System.IO.Path]::GetTempPath()) "config-m365-test-$([guid]::NewGuid()).json"

function Set-TestConfig([string]$Json) {
    Set-Content -Path $tempConfig -Value $Json
}

try {
    # Placeholder resolution
    $env:TEST_MC_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    Assert-Equal 'literal-value' (Resolve-M365ConfigValue 'literal-value') 'literal value passes through'
    Assert-Equal $env:TEST_MC_TENANT_ID (Resolve-M365ConfigValue '${TEST_MC_TENANT_ID}') 'placeholder resolves from environment'
    Assert-Equal $null (Resolve-M365ConfigValue '${TEST_MC_NOT_SET}') 'unset placeholder resolves to null'
    Assert-Equal $null (Resolve-M365ConfigValue '  ') 'blank value resolves to null'

    # Legacy single tenant configuration file
    Set-TestConfig '{ "tenantId": "tenant-1", "clientId": "client-1" }'
    $legacy = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 1 $legacy.Count 'legacy config returns one tenant'
    Assert-Equal 'tenant-1' $legacy[0].TenantId 'legacy tenant id'
    Assert-Equal 'clientSecret' $legacy[0].Auth 'legacy tenant defaults to client secret auth'
    Assert-Equal 'secret-1' $legacy[0].ClientSecret 'legacy tenant uses the supplied secret'
    Assert-Equal $true $legacy[0].Required 'first tenant is required by default'
    Assert-Equal $true $legacy[0].IsConfigured 'legacy tenant is configured'

    Set-TestConfig '{ "tenantId": "tenant-1", "clientId": "client-1" }'
    $noSecret = @(Get-M365TenantConfig -ConfigPath $tempConfig)
    Assert-Equal $false $noSecret[0].IsConfigured 'client secret tenant without a secret is not configured'
    Assert-Equal 'no client secret was supplied' $noSecret[0].SkipReason 'missing secret is reported'

    # Multi tenant configuration with a federated identity tenant
    $multiTenantConfig = @'
{
    "tenants": [
        { "name": "primary", "tenantId": "tenant-1", "clientId": "client-1", "auth": "clientSecret", "required": true },
        { "name": "federated", "tenantId": "${TEST_MC_TENANT_ID}", "clientId": "${TEST_MC_CLIENT_ID}", "auth": "federatedIdentity", "required": false }
    ]
}
'@

    Set-TestConfig $multiTenantConfig
    $env:TEST_MC_CLIENT_ID = $null
    $partial = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 2 $partial.Count 'multi tenant config returns both tenants'
    Assert-Equal $true $partial[0].IsConfigured 'primary tenant is configured'
    Assert-Equal $false $partial[1].IsConfigured 'federated tenant without a client id is skipped'
    Assert-Equal 'clientId is not configured' $partial[1].SkipReason 'missing client id is reported'
    Assert-Equal $false $partial[1].Required 'federated tenant is optional'

    $env:TEST_MC_CLIENT_ID = '11111111-2222-3333-4444-555555555555'
    $full = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal $true $full[1].IsConfigured 'federated tenant is configured once both ids resolve'
    Assert-Equal 'federatedIdentity' $full[1].Auth 'federated tenant auth mode'
    Assert-Equal 'api://AzureADTokenExchange' $full[1].Audience 'federated tenant uses the default audience'
    Assert-Equal $null $full[1].ClientSecret 'federated tenant does not need a client secret'

    # Per tenant secret environment variable
    Set-TestConfig '{ "tenants": [ { "name": "other", "tenantId": "tenant-2", "clientId": "client-2", "secretEnv": "TEST_MC_SECRET" } ] }'
    $env:TEST_MC_SECRET = 'secret-2'
    $secretEnvTenant = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 'secret-2' $secretEnvTenant[0].ClientSecret 'secretEnv overrides the default secret'

    # Private contributor tenants expanded from a JSON list
    $contributorConfig = @'
{
    "tenants": [
        { "name": "primary", "tenantId": "tenant-1", "clientId": "client-1", "auth": "clientSecret", "required": true },
        { "name": "contributor", "tenantListEnv": "TEST_MC_CONTRIBUTORS", "clientId": "${TEST_MC_CLIENT_ID}", "auth": "federatedIdentity", "private": true }
    ]
}
'@

    Set-TestConfig $contributorConfig
    $env:TEST_MC_CONTRIBUTORS = $null
    $noContributors = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 1 $noContributors.Count 'an unset contributor list adds no tenants'

    $env:TEST_MC_CLIENT_ID = 'shared-app'
    $env:TEST_MC_CONTRIBUTORS = '[ "tenant-a", { "label": "edu1", "tenantId": "tenant-b" }, { "label": "Contoso Ltd", "tenantId": "tenant-c", "clientId": "own-app" }, { "label": "x" } ]'
    $contributors = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 5 $contributors.Count 'each contributor becomes its own tenant'
    Assert-Equal 'contributor-01' $contributors[1].Name 'a bare tenant id gets a numbered label'
    Assert-Equal 'tenant-a' $contributors[1].TenantId 'a bare tenant id is read'
    Assert-Equal 'shared-app' $contributors[1].ClientId 'contributors default to the shared multi-tenant app'
    Assert-Equal 'contributor-edu1' $contributors[2].Name 'an anonymous label is kept'
    Assert-Equal 'contributor-03' $contributors[3].Name 'a label that could identify an organization is replaced'
    Assert-Equal 'own-app' $contributors[3].ClientId 'a contributor can bring their own app'
    Assert-Equal 'federatedIdentity' $contributors[3].Auth 'contributors use federated identity'
    Assert-Equal $true $contributors[3].Private 'contributors are private'
    Assert-Equal $false $contributors[3].Required 'contributors are never required'
    Assert-Equal $false $contributors[0].Private 'the primary tenant is not private'
    Assert-Equal $false $contributors[4].IsConfigured 'a contributor without a tenant id is skipped'

    $env:TEST_MC_CONTRIBUTORS = '{ not json'
    $badList = @(Get-M365TenantConfig -ConfigPath $tempConfig -DefaultClientSecret 'secret-1')
    Assert-Equal 2 $badList.Count 'an invalid contributor list is reported once'
    Assert-Equal $false $badList[1].IsConfigured 'an invalid contributor list is skipped'
    Assert-Equal 'TEST_MC_CONTRIBUTORS is not valid JSON' $badList[1].SkipReason 'an invalid list does not echo its contents'
    Assert-Equal $false $badList[1].Required 'an invalid contributor list never fails the refresh'

    # Error messages for private tenants are reduced to error codes
    $signInError = "AADSTS7000229: The client application is missing service principal in the tenant 'Contoso'. AADSTS7000229 again."
    $privateTenant = [pscustomobject]@{ Name = 'contributor-01'; Private = $true }
    $publicTenant = [pscustomobject]@{ Name = 'primary'; Private = $false }
    $safe = Get-M365SafeErrorMessage -Tenant $privateTenant -ErrorRecord $signInError
    Assert-Equal 'AADSTS7000229 (details hidden for contributor tenants)' $safe 'private tenant errors keep only the codes'
    Assert-Equal 'request failed (details hidden for contributor tenants)' (Get-M365SafeErrorMessage -Tenant $privateTenant -ErrorRecord 'Contoso is offline') 'private tenant errors without a code are generic'
    Assert-Equal $signInError (Get-M365SafeErrorMessage -Tenant $publicTenant -ErrorRecord $signInError) 'public tenant errors are unchanged'

    # Merging tenants
    $newer = [pscustomobject]@{ Id = 'MC100'; LastModifiedDateTime = '2026-08-02T00:00:00Z'; Body = [pscustomobject]@{ Content = 'short'; Markdown = '' } }
    $older = [pscustomobject]@{ Id = 'MC100'; LastModifiedDateTime = '2026-08-01T00:00:00Z'; Body = [pscustomobject]@{ Content = 'a much longer body from the other tenant'; Markdown = '' } }
    $onlyInSecond = [pscustomobject]@{ Id = 'MC200'; LastModifiedDateTime = '2026-08-03T00:00:00Z'; Body = [pscustomobject]@{ Content = 'second tenant only'; Markdown = '' } }
    $richer = [pscustomobject]@{ Id = 'MC300'; LastModifiedDateTime = '2026-08-04T00:00:00Z'; Body = [pscustomobject]@{ Content = 'plenty of extra detail for this post'; Markdown = '' } }
    $sparse = [pscustomobject]@{ Id = 'MC300'; LastModifiedDateTime = '2026-08-04T00:00:00Z'; Body = [pscustomobject]@{ Content = 'brief'; Markdown = '' } }

    $map = [ordered]@{}
    $first = Add-M365MessageCenterItems -Map $map -Items @($older, $sparse) -TenantName 'primary'
    Assert-Equal 2 $first.Added 'first tenant adds every post'

    $second = Add-M365MessageCenterItems -Map $map -Items @($newer, $onlyInSecond, $richer) -TenantName 'federated'
    Assert-Equal 1 $second.Added 'second tenant adds only the posts the first cannot see'
    Assert-Equal 2 $second.Replaced 'newer and richer copies replace the existing ones'
    Assert-Equal 0 $second.Ignored 'nothing was ignored in this round'

    $third = Add-M365MessageCenterItems -Map $map -Items @($older) -TenantName 'third'
    Assert-Equal 1 $third.Ignored 'an older copy never overwrites a newer one'

    Assert-Equal 3 $map.Count 'merged map holds the union of both tenants'
    Assert-Equal 'short' $map['MC100'].Body.Content 'newest copy wins'
    Assert-Equal 'plenty of extra detail for this post' $map['MC300'].Body.Content 'richest copy wins on equal timestamps'

    $sorted = @(Get-SortedMessageCenterItems -Map $map)
    Assert-Equal 'MC300' $sorted[0].Id 'merged items are sorted newest first'
    Assert-Equal 'MC100' $sorted[2].Id 'oldest merged item is last'
}
finally {
    Remove-Item $tempConfig -ErrorAction SilentlyContinue
    $env:TEST_MC_TENANT_ID = $null
    $env:TEST_MC_CLIENT_ID = $null
    $env:TEST_MC_SECRET = $null
    $env:TEST_MC_CONTRIBUTORS = $null
}

if ($failures -gt 0) {
    throw "Failed $failures of $assertions tenant configuration assertions"
}

Write-Host "Passed $assertions multi-tenant Message Center assertions"
