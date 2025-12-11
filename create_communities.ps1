# DSpace API - Create King Fahd National Library Communities
$baseUrl = "http://localhost:8080/server/api"
$user = "ali@ali.com"
$password = "admin"

# Communities data for King Fahd National Library
$communities = @(
    @{
        name = "مكتبة الملك فهد الوطنية - المجموعة الرئيسية"
        description = "المجموعة الرئيسية لمكتبة الملك فهد الوطنية في الرياض"
    },
    @{
        name = "قسم المخطوطات والوثائق النادرة"
        description = "يحتوي على المخطوطات العربية والإسلامية النادرة والوثائق التاريخية"
    },
    @{
        name = "قسم الكتب العربية"
        description = "مجموعة الكتب العربية المطبوعة في مختلف المجالات"
    },
    @{
        name = "قسم الكتب الأجنبية"
        description = "مجموعة الكتب بالغات الأجنبية المختلفة"
    },
    @{
        name = "قسم الدوريات والمجلات"
        description = "الدوريات والمجلات العلمية والثقافية"
    },
    @{
        name = "قسم الرسائل الجامعية"
        description = "رسائل الماجستير والدكتوراه من الجامعات السعودية والعربية"
    },
    @{
        name = "قسم المواد السمعية والبصرية"
        description = "الأفلام الوثائقية والتسجيلات الصوتية والمرئية"
    },
    @{
        name = "قسم الخرائط والأطالس"
        description = "الخرائط الجغرافية والتاريخية والأطالس"
    },
    @{
        name = "قسم التراث السعودي"
        description = "مجموعة التراث والثقافة السعودية"
    },
    @{
        name = "قسم المصادر الرقمية"
        description = "الموارد والمصادر الرقمية والإلكترونية"
    }
)

# Step 1: Get CSRF token
Write-Host "Getting CSRF token..." -ForegroundColor Yellow
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$statusResponse = Invoke-WebRequest -Uri "$baseUrl/authn/status" -Method Get -WebSession $session -UseBasicParsing
$csrfToken = $statusResponse.Headers['DSPACE-XSRF-TOKEN']
Write-Host "CSRF Token: $csrfToken" -ForegroundColor Green

# Step 2: Login
Write-Host "`nLogging in..." -ForegroundColor Yellow
$loginHeaders = @{
    "Content-Type" = "application/x-www-form-urlencoded"
    "X-XSRF-TOKEN" = $csrfToken
}
$loginBody = "user=$user&password=$password"
$loginResponse = Invoke-WebRequest -Uri "$baseUrl/authn/login" -Method Post -Headers $loginHeaders -Body $loginBody -WebSession $session -UseBasicParsing
$authToken = $loginResponse.Headers['Authorization']
Write-Host "Auth Token obtained: $($authToken.Substring(0, 50))..." -ForegroundColor Green

# Get new CSRF token after login
$statusResponse2 = Invoke-WebRequest -Uri "$baseUrl/authn/status" -Method Get -WebSession $session -Headers @{"Authorization" = $authToken} -UseBasicParsing
$csrfToken = $statusResponse2.Headers['DSPACE-XSRF-TOKEN']

# Step 3: Create communities
Write-Host "`nCreating communities..." -ForegroundColor Yellow
$createdCount = 0

foreach ($community in $communities) {
    $communityData = @{
        name = $community.name
        metadata = @{
            "dc.title" = @(
                @{
                    value = $community.name
                    language = "ar"
                }
            )
            "dc.description" = @(
                @{
                    value = $community.description
                    language = "ar"
                }
            )
            "dc.description.abstract" = @(
                @{
                    value = $community.description
                    language = "ar"
                }
            )
        }
    } | ConvertTo-Json -Depth 10

    $createHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = $authToken
        "X-XSRF-TOKEN" = $csrfToken
    }

    try {
        $createResponse = Invoke-WebRequest -Uri "$baseUrl/core/communities" -Method Post -Headers $createHeaders -Body $communityData -WebSession $session -UseBasicParsing -ContentType "application/json; charset=utf-8"
        $responseObj = $createResponse.Content | ConvertFrom-Json
        $createdCount++
        Write-Host "[$createdCount/10] Created: $($community.name)" -ForegroundColor Green
        Write-Host "   UUID: $($responseObj.uuid)" -ForegroundColor Cyan

        # Get new CSRF token for next request
        $statusResponse3 = Invoke-WebRequest -Uri "$baseUrl/authn/status" -Method Get -WebSession $session -Headers @{"Authorization" = $authToken} -UseBasicParsing
        $csrfToken = $statusResponse3.Headers['DSPACE-XSRF-TOKEN']
    }
    catch {
        Write-Host "Failed to create: $($community.name)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Response: $errorBody" -ForegroundColor Red
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Completed! Created $createdCount out of 10 communities." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
