# Test DSpace Login
$baseUrl = "http://localhost:8080/server/api"
$user = "ali@ali.com"
$password = "admin"

Write-Host "Testing DSpace API Connection..." -ForegroundColor Cyan

# Step 1: Get initial status and CSRF
Write-Host "`n1. Getting initial status..." -ForegroundColor Yellow
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $statusResponse = Invoke-WebRequest -Uri "$baseUrl/authn/status" -Method Get -WebSession $session -UseBasicParsing
    Write-Host "Status Code: $($statusResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Headers:" -ForegroundColor Yellow
    $statusResponse.Headers.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

    # Try to get CSRF from cookie
    Write-Host "`nCookies:" -ForegroundColor Yellow
    $session.Cookies.GetCookies("http://localhost:8080") | ForEach-Object { Write-Host "  $($_.Name): $($_.Value)" }

    $csrfToken = $statusResponse.Headers['DSPACE-XSRF-TOKEN']
    if (-not $csrfToken) {
        # Try getting from Set-Cookie header
        $setCookie = $statusResponse.Headers['Set-Cookie']
        if ($setCookie -match 'DSPACE-XSRF-COOKIE=([^;]+)') {
            $csrfToken = $Matches[1]
        }
    }
    Write-Host "`nCSRF Token: $csrfToken" -ForegroundColor Cyan
}
catch {
    Write-Host "Error getting status: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 2: Login
Write-Host "`n2. Attempting login..." -ForegroundColor Yellow
$loginHeaders = @{
    "Content-Type" = "application/x-www-form-urlencoded"
    "X-XSRF-TOKEN" = $csrfToken
}
$loginBody = "user=$user&password=$password"

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/authn/login" -Method Post -Headers $loginHeaders -Body $loginBody -WebSession $session -UseBasicParsing
    Write-Host "Login Status Code: $($loginResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Login Headers:" -ForegroundColor Yellow
    $loginResponse.Headers.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

    $authToken = $loginResponse.Headers['Authorization']
    Write-Host "`nAuth Token: $authToken" -ForegroundColor Cyan
}
catch {
    Write-Host "Login Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody" -ForegroundColor Red
    }
}
