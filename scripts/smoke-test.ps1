# Post-deploy checks for the hosted store.
# Usage:
#   .\scripts\smoke-test.ps1 -ApiBase https://<api>.up.railway.app/api -WebBase https://<web>.vercel.app
#   .\scripts\smoke-test.ps1 -ApiBase ... -WebBase ... -AdminPassword '...'
param(
    [Parameter(Mandatory = $true)][string]$ApiBase,
    [Parameter(Mandatory = $true)][string]$WebBase,
    [string]$AdminPassword = $env:ADMIN_PASSWORD,
    [string]$Origin = ''
)

$ApiBase = $ApiBase.TrimEnd('/')
$WebBase = $WebBase.TrimEnd('/')
$AdminBase = $ApiBase -replace '/api$', ''
if (-not $Origin) { $Origin = $WebBase }

$script:failures = 0

function Check-Status {
    param([string]$Name, [string]$Url, [int]$Expected, [string[]]$CurlArgs = @())

    $code = & curl.exe -s -o NUL -w '%{http_code}' --max-time 30 @CurlArgs $Url
    if ([int]$code -eq $Expected) {
        Write-Host "PASS  $Name ($code)" -ForegroundColor Green
    } else {
        Write-Host "FAIL  $Name (got $code, want $Expected)" -ForegroundColor Red
        $script:failures++
    }
}

Write-Host "API: $ApiBase"
Write-Host "Web: $WebBase"
Write-Host ''

Check-Status 'API config (also checks the database)' "$ApiBase/config" 200
Check-Status 'Product list' "$ApiBase/products" 200
Check-Status 'Township list' "$ApiBase/townships" 200
Check-Status 'Storefront home' "$WebBase/" 200
Check-Status 'Category page' "$WebBase/c/women" 200
Check-Status 'Cart page' "$WebBase/cart" 200

# Pick a real slug from the API so the PDP check survives a catalogue swap.
try {
    $products = (& curl.exe -s --max-time 30 "$ApiBase/products") | ConvertFrom-Json
    $slug = $products.data[0].slug
    if ($slug) {
        Check-Status "Product page /p/$slug" "$WebBase/p/$slug" 200
    }
} catch {
    Write-Host 'SKIP  Product page (could not read the product list)' -ForegroundColor Yellow
}

if ($AdminPassword) {
    Check-Status 'Admin rejects a wrong password' "$AdminBase/admin/orders" 401 @('-u', 'admin:definitely-wrong')
    Check-Status 'Admin accepts the password' "$AdminBase/admin/orders" 200 @('-u', "admin:$AdminPassword")
} else {
    Write-Host 'SKIP  Admin checks (pass -AdminPassword or set ADMIN_PASSWORD)' -ForegroundColor Yellow
}

# CORS preflight from the storefront origin: the checkout posts from the browser.
$headers = & curl.exe -s -D - -o NUL --max-time 30 -X OPTIONS "$ApiBase/orders" `
    -H "Origin: $Origin" `
    -H 'Access-Control-Request-Method: POST' `
    -H 'Access-Control-Request-Headers: content-type'
$allowOrigin = ($headers | Where-Object { $_ -match '^access-control-allow-origin:' } | Select-Object -First 1) -replace '^[^:]+:\s*', ''

if ($allowOrigin -and $allowOrigin.Trim() -eq $Origin) {
    Write-Host "PASS  CORS preflight for $Origin" -ForegroundColor Green
} else {
    Write-Host "FAIL  CORS preflight for $Origin (got '$allowOrigin')" -ForegroundColor Red
    $script:failures++
}

Write-Host ''
if ($script:failures -eq 0) {
    Write-Host 'All checks passed.' -ForegroundColor Green
    exit 0
}

Write-Host "$($script:failures) check(s) failed." -ForegroundColor Red
exit 1
