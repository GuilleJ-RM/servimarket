$base = "http://localhost:3001/api"
$results = @()

function Do-Test {
  param($Name, $Url, $Method="GET", $Body=$null, $ExpectGood=@(200,400,401,403,404,413,429))
  try {
    $args = @("-s", "-o", "NUL", "-w", "%{http_code}", "-X", $Method)
    if ($Body) {
      $args += @("-H", "Content-Type: application/json", "-d", $Body)
    }
    $args += $Url
    $code = [int](& curl.exe @args)
    $status = if ($code -in $ExpectGood) { "PASS" } else { "FAIL" }
    return [PSCustomObject]@{Test=$Name; Status=$status; Code=$code}
  } catch {
    return [PSCustomObject]@{Test=$Name; Status="WARN"; Code=0}
  }
}

function Do-ContentTest {
  param($Name, $Url, $Method="GET", $Body=$null, $BadPattern)
  try {
    $args = @("-s", "-X", $Method)
    if ($Body) {
      $args += @("-H", "Content-Type: application/json", "-d", $Body)
    }
    $args += $Url
    $content = & curl.exe @args
    if ($content -match $BadPattern) {
      return [PSCustomObject]@{Test=$Name; Status="FAIL"; Code="---"}
    } else {
      return [PSCustomObject]@{Test=$Name; Status="PASS"; Code="---"}
    }
  } catch {
    return [PSCustomObject]@{Test=$Name; Status="WARN"; Code=0}
  }
}

function Do-HeaderTest {
  param($Name, $Url, $HeaderName, $ShouldExist=$true)
  $raw = & curl.exe -s -D - -o NUL $Url
  $found = $raw -match "(?i)$HeaderName"
  $ok = if ($ShouldExist) { $found } else { -not $found }
  $status = if ($ok) { "PASS" } else { "FAIL" }
  return [PSCustomObject]@{Test=$Name; Status=$status; Code="---"}
}

Write-Host ""
Write-Host "============================================"
Write-Host "  SECURITY & VALIDATION TEST SUITE"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================"
Write-Host ""

# ======= 1. SQL INJECTION =======
Write-Host ">>> 1. SQL INJECTION TESTS <<<"
$results += Do-Test "SQLi: OR 1=1 in search" "$base/listings?search=%27%20OR%201%3D1%20--"
$results += Do-Test "SQLi: UNION SELECT" "$base/listings?search=%27%20UNION%20SELECT%20%2A%20FROM%20users%20--"
$results += Do-Test "SQLi: DROP TABLE" "$base/jobs?search=%27%3B%20DROP%20TABLE%20users%3B%20--"
$results += Do-Test "SQLi: numeric categoryId" "$base/listings?categoryId=1%20OR%201%3D1"
$results += Do-Test "SQLi: login email" "$base/auth/login" "POST" '{"email":"admin@test.com'' OR ''1''=''1","password":"x"}'
$results[-5..-1] | ForEach-Object { Write-Host "  [$($_.Status)] $($_.Test) ($($_.Code))" }

# ======= 2. AUTH BYPASS =======
Write-Host ""
Write-Host ">>> 2. AUTH BYPASS TESTS (no cookie) <<<"
$authEndpoints = @(
  @{n="GET /bookings"; u="$base/bookings"},
  @{n="GET /conversations"; u="$base/conversations"},
  @{n="GET /admin/users"; u="$base/admin/users"},
  @{n="GET /admin/listings"; u="$base/admin/listings"},
  @{n="GET /admin/jobs"; u="$base/admin/jobs"},
  @{n="GET /admin/stats"; u="$base/admin/stats"},
  @{n="GET /jobs/my"; u="$base/jobs/my"},
  @{n="GET /listings/my"; u="$base/listings/my"},
  @{n="GET /cvs/public"; u="$base/cvs/public"},
  @{n="GET /auth/me"; u="$base/auth/me"},
  @{n="POST /bookings"; u="$base/bookings"; m="POST"; b='{"listingId":1}'},
  @{n="POST /listings"; u="$base/listings"; m="POST"; b='{"title":"x"}'},
  @{n="POST /messages"; u="$base/messages"; m="POST"; b='{"conversationId":1,"content":"t"}'},
  @{n="POST /upload/image"; u="$base/upload/image"; m="POST"; b='{"image":"x"}'}
)
foreach ($ep in $authEndpoints) {
  $m = if ($ep.m) { $ep.m } else { "GET" }
  $b = if ($ep.b) { $ep.b } else { $null }
  $r = Do-Test $ep.n $ep.u $m $b @(401,403)
  $results += $r
  Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"
}

# ======= 3. XSS PAYLOADS =======
Write-Host ""
Write-Host ">>> 3. XSS PAYLOAD TESTS <<<"
$xssPayloads = @(
  "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
  "%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
  "javascript%3Aalert(1)",
  "%22%3E%3Csvg%20onload%3Dalert(1)%3E"
)
$xssNames = @("script tag", "img onerror", "javascript: proto", "svg onload")
for ($i = 0; $i -lt $xssPayloads.Length; $i++) {
  $r = Do-ContentTest "XSS: $($xssNames[$i])" "$base/listings?search=$($xssPayloads[$i])" "GET" $null "<script>|onerror=|onload=|javascript:"
  $results += $r
  Write-Host "  [$($r.Status)] $($r.Test)"
}

# ======= 4. INPUT VALIDATION =======
Write-Host ""
Write-Host ">>> 4. INPUT VALIDATION TESTS <<<"

# Invalid listing IDs
$invalidIds = @("abc", "0", "-1", "99999999", "1.5", "null", "NaN")
foreach ($id in $invalidIds) {
  $r = Do-Test "Invalid listing ID: $id" "$base/listings/$id"
  $results += $r
  Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"
}

# Bad registration data
$regTests = @(
  @{n="Register: missing email"; b='{"password":"test123","name":"Test"}'},
  @{n="Register: missing password"; b='{"email":"test@test.com","name":"Test"}'},
  @{n="Register: missing name"; b='{"email":"test@test.com","password":"test123"}'},
  @{n="Register: short password"; b='{"email":"test@test.com","password":"12","name":"Test"}'},
  @{n="Register: invalid email format"; b='{"email":"not-an-email","password":"test123","name":"Test"}'}
)
foreach ($rt in $regTests) {
  $r = Do-Test $rt.n "$base/auth/register" "POST" $rt.b @(400)
  $results += $r
  Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"
}

# Empty/invalid bodies
$r = Do-Test "Login: empty body" "$base/auth/login" "POST" '{}'
$results += $r; Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"

$r = Do-Test "Login: invalid JSON" "$base/auth/login" "POST" 'not-json'
$results += $r; Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"

# Oversized pagination
$r = Do-Test "Listings: limit=99999" "$base/listings?limit=99999"
$results += $r; Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"

$r = Do-Test "Listings: page=-1" "$base/listings?page=-1"
$results += $r; Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"

# ======= 5. PATH TRAVERSAL =======
Write-Host ""
Write-Host ">>> 5. PATH TRAVERSAL TESTS <<<"
$traversals = @(
  @{n="Traversal: ../etc/passwd"; u="$base/../../../etc/passwd"},
  @{n="Traversal: null byte"; u="$base/listings/test%00.json"},
  @{n="Traversal: double encode"; u="$base/%252e%252e%252fetc%252fpasswd"}
)
foreach ($t in $traversals) {
  $r = Do-Test $t.n $t.u
  $results += $r; Write-Host "  [$($r.Status)] $($r.Test) ($($r.Code))"
}

# ======= 6. RESPONSE HEADERS =======
Write-Host ""
Write-Host ">>> 6. RESPONSE HEADER SECURITY <<<"
$r = Do-HeaderTest "X-Powered-By absent" "$base/healthz" "X-Powered-By" $false
$results += $r; Write-Host "  [$($r.Status)] $($r.Test)"
$r = Do-HeaderTest "Content-Type present" "$base/healthz" "Content-Type" $true
$results += $r; Write-Host "  [$($r.Status)] $($r.Test)"

# ======= 7. LARGE PAYLOAD =======
Write-Host ""
Write-Host ">>> 7. LARGE PAYLOAD TESTS <<<"
# Generate ~12MB payload
$bigString = "A" * (12 * 1024 * 1024)
$tmpFile = [System.IO.Path]::GetTempFileName()
'{"email":"test@test.com","password":"' + $bigString + '"}' | Out-File -FilePath $tmpFile -Encoding utf8 -NoNewline
$code = [int](& curl.exe -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "@$tmpFile" "$base/auth/login")
Remove-Item $tmpFile -Force
$status = if ($code -in @(400,413)) { "PASS" } else { "FAIL" }
$results += [PSCustomObject]@{Test="12MB JSON body"; Status=$status; Code=$code}
Write-Host "  [$status] 12MB JSON body ($code)"

# ======= 8. CORS =======
Write-Host ""
Write-Host ">>> 8. CORS TESTS <<<"
$corsHeaders = & curl.exe -s -D - -o NUL -H "Origin: http://evil.com" "$base/healthz"
$hasACAO = $corsHeaders -match "access-control-allow-origin"
$allowsEvil = $corsHeaders -match "http://evil.com"
if (-not $hasACAO -or -not $allowsEvil) {
  $results += [PSCustomObject]@{Test="CORS: rejects evil origin"; Status="PASS"; Code="---"}
  Write-Host "  [PASS] CORS: rejects evil origin"
} else {
  $results += [PSCustomObject]@{Test="CORS: rejects evil origin"; Status="FAIL"; Code="---"}
  Write-Host "  [FAIL] CORS: accepts evil origin!"
}

# ======= SUMMARY =======
Write-Host ""
Write-Host "============================================"
Write-Host "  RESULTS SUMMARY"
Write-Host "============================================"
$passCount = ($results | Where-Object {$_.Status -eq "PASS"}).Count
$failCount = ($results | Where-Object {$_.Status -eq "FAIL"}).Count
$warnCount = ($results | Where-Object {$_.Status -eq "WARN"}).Count
Write-Host "  PASS: $passCount" -ForegroundColor Green
Write-Host "  FAIL: $failCount" -ForegroundColor Red
Write-Host "  WARN: $warnCount" -ForegroundColor Yellow
Write-Host "  TOTAL: $($results.Count)"
Write-Host ""

if ($failCount -gt 0) {
  Write-Host "  === FAILURES ===" -ForegroundColor Red
  $results | Where-Object {$_.Status -eq "FAIL"} | ForEach-Object {
    Write-Host "    [FAIL] $($_.Test) (code: $($_.Code))" -ForegroundColor Red
  }
}
if ($warnCount -gt 0) {
  Write-Host "  === WARNINGS ===" -ForegroundColor Yellow
  $results | Where-Object {$_.Status -eq "WARN"} | ForEach-Object {
    Write-Host "    [WARN] $($_.Test) (code: $($_.Code))" -ForegroundColor Yellow
  }
}
Write-Host ""
Write-Host "============================================"
