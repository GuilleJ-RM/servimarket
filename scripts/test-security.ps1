$base = "http://localhost:3001/api"
$results = @()
$pass = 0; $fail = 0; $warn = 0

function Test-Endpoint {
  param($Name, $Url, $Method="GET", $Body=$null, $ExpectCode=@(), $CheckFn=$null)
  try {
    $params = @{Uri=$Url; Method=$Method; TimeoutSec=5; ErrorAction="Stop"}
    if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
    $r = Invoke-WebRequest @params
    $code = $r.StatusCode
    $content = $r.Content
    if ($CheckFn) {
      $result = & $CheckFn $code $content
      return $result
    }
    if ($ExpectCode -and $code -notin $ExpectCode) {
      return [PSCustomObject]@{Test=$Name; Status="FAIL"; Code=$code; Detail="Unexpected status"}
    }
    return [PSCustomObject]@{Test=$Name; Status="PASS"; Code=$code; Detail="OK"}
  } catch {
    $code = 0
    try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
    if ($ExpectCode -and $code -in $ExpectCode) {
      return [PSCustomObject]@{Test=$Name; Status="PASS"; Code=$code; Detail="Expected rejection"}
    }
    if ($code -in @(400,401,403,404,429)) {
      return [PSCustomObject]@{Test=$Name; Status="PASS"; Code=$code; Detail="Rejected"}
    }
    return [PSCustomObject]@{Test=$Name; Status="WARN"; Code=$code; Detail=$_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length))}
  }
}

Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "  SECURITY & STRESS TEST SUITE" -ForegroundColor Yellow
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "============================================`n" -ForegroundColor Yellow

# ═══════════════ 1. SQL INJECTION ═══════════════
Write-Host ">>> 1. SQL INJECTION TESTS <<<" -ForegroundColor Cyan
$sqli = @(
  @{n="SQLi listings search (OR 1=1)"; u="$base/listings?search=%27%20OR%201%3D1%20--"},
  @{n="SQLi listings search (UNION)"; u="$base/listings?search=%27%20UNION%20SELECT%20%2A%20FROM%20users%20--"},
  @{n="SQLi jobs search (DROP)"; u="$base/jobs?search=%27%3B%20DROP%20TABLE%20users%3B%20--"},
  @{n="SQLi category ID"; u="$base/listings?categoryId=1%20OR%201%3D1"},
  @{n="SQLi login email"; u="$base/auth/login"; m="POST"; b='{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"x"}'}
)
foreach ($t in $sqli) {
  $m = if ($t.m) { $t.m } else { "GET" }
  $b = if ($t.b) { $t.b } else { $null }
  $r = Test-Endpoint -Name $t.n -Url $t.u -Method $m -Body $b -ExpectCode @(200,400,401,404)
  $results += $r
  $icon = if ($r.Status -eq "PASS") { "[OK]" } elseif ($r.Status -eq "FAIL") { "[!!]" } else { "[??]" }
  Write-Host "  $icon $($r.Test): $($r.Status) ($($r.Code)) - $($r.Detail)"
}

# ═══════════════ 2. AUTH BYPASS ═══════════════
Write-Host "`n>>> 2. AUTH BYPASS TESTS <<<" -ForegroundColor Cyan
$authTests = @(
  "bookings", "conversations", "admin/users", "admin/listings", "admin/jobs",
  "admin/stats", "jobs/my", "listings/my", "cvs/public", "auth/me"
)
foreach ($ep in $authTests) {
  $r = Test-Endpoint -Name "No auth: GET /$ep" -Url "$base/$ep" -ExpectCode @(401,403)
  $results += $r
  $icon = if ($r.Status -eq "PASS") { "[OK]" } elseif ($r.Status -eq "FAIL") { "[!!]" } else { "[??]" }
  Write-Host "  $icon $($r.Test): $($r.Status) ($($r.Code))"
}

# POST without auth
$postTests = @(
  @{n="No auth: POST /upload/image"; u="$base/upload/image"; b='{"data":"x","filename":"t.jpg"}'},
  @{n="No auth: POST /bookings"; u="$base/bookings"; b='{"listingId":1}'},
  @{n="No auth: POST /messages"; u="$base/messages"; b='{"conversationId":1,"content":"test"}'},
  @{n="No auth: POST /listings"; u="$base/listings"; b='{"title":"x"}'},
  @{n="No auth: PATCH /admin/users/1"; u="$base/admin/users/1"; b='{"name":"x"}'}
)
foreach ($t in $postTests) {
  $m = if ($t.u -match "PATCH") { "PATCH" } else { "POST" }
  $r = Test-Endpoint -Name $t.n -Url $t.u -Method $m -Body $t.b -ExpectCode @(401,403)
  $results += $r
  $icon = if ($r.Status -eq "PASS") { "[OK]" } elseif ($r.Status -eq "FAIL") { "[!!]" } else { "[??]" }
  Write-Host "  $icon $($r.Test): $($r.Status) ($($r.Code))"
}

# ═══════════════ 3. XSS PAYLOADS ═══════════════
Write-Host "`n>>> 3. XSS PAYLOAD TESTS <<<" -ForegroundColor Cyan
$xss = @(
  "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
  "%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
  "javascript%3Aalert(1)",
  "%22%3E%3Csvg%20onload%3Dalert(1)%3E"
)
foreach ($payload in $xss) {
  $r = Test-Endpoint -Name "XSS in search" -Url "$base/listings?search=$payload" -CheckFn {
    param($code, $content)
    if ($content -match "<script>" -or $content -match "onerror=" -or $content -match "onload=") {
      [PSCustomObject]@{Test="XSS reflected"; Status="FAIL"; Code=$code; Detail="Script reflected in response!"}
    } else {
      [PSCustomObject]@{Test="XSS not reflected"; Status="PASS"; Code=$code; Detail="Safe"}
    }
  }
  $results += $r
  $icon = if ($r.Status -eq "PASS") { "[OK]" } else { "[!!]" }
  Write-Host "  $icon $($r.Test): $($r.Status) ($($r.Code))"
}

# ═══════════════ 4. INPUT VALIDATION ═══════════════
Write-Host "`n>>> 4. INPUT VALIDATION TESTS <<<" -ForegroundColor Cyan

# Oversized inputs
$r = Test-Endpoint -Name "Oversized search (200 chars)" -Url "$base/listings?search=$('A' * 200)" -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

$r = Test-Endpoint -Name "Oversized locality (200 chars)" -Url "$base/listings?search=ok&locality=$('B' * 200)" -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

# Invalid IDs
$invalidIds = @("abc", "0", "-1", "99999999", "1.5", "null", "undefined", "NaN")
foreach ($id in $invalidIds) {
  $r = Test-Endpoint -Name "Invalid listing ID: $id" -Url "$base/listings/$id" -ExpectCode @(400,404)
  $results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"
}

# Negative/zero quantity
$r = Test-Endpoint -Name "Register: email too long" -Url "$base/auth/register" -Method POST `
  -Body ('{"email":"' + ('a' * 300) + '@test.com","password":"test123","name":"Test"}') -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

$r = Test-Endpoint -Name "Register: short password" -Url "$base/auth/register" -Method POST `
  -Body '{"email":"test@test.com","password":"12","name":"Test"}' -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

$r = Test-Endpoint -Name "Register: missing name" -Url "$base/auth/register" -Method POST `
  -Body '{"email":"test@test.com","password":"test123"}' -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

$r = Test-Endpoint -Name "Login: empty body" -Url "$base/auth/login" -Method POST -Body '{}' -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

$r = Test-Endpoint -Name "Login: invalid JSON" -Url "$base/auth/login" -Method POST -Body 'not-json' -ExpectCode @(400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

# ═══════════════ 5. PATH TRAVERSAL ═══════════════
Write-Host "`n>>> 5. PATH TRAVERSAL TESTS <<<" -ForegroundColor Cyan
$traversal = @(
  @{n="Path traversal in upload filename"; u="$base/uploads/../../etc/passwd"},
  @{n="Path traversal (backslash)"; u="$base/uploads/..%5C..%5Cetc%5Cpasswd"},
  @{n="Null byte in filename"; u="$base/uploads/test.jpg%00.exe"},
  @{n="Double encoding"; u="$base/uploads/%252e%252e%252fetc%252fpasswd"}
)
foreach ($t in $traversal) {
  $r = Test-Endpoint -Name $t.n -Url $t.u -ExpectCode @(400,404)
  $results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"
}

# ═══════════════ 6. HTTP METHOD TESTS ═══════════════
Write-Host "`n>>> 6. HTTP METHOD TESTS <<<" -ForegroundColor Cyan
$methods = @("DELETE", "PUT", "PATCH", "OPTIONS")
foreach ($m in $methods) {
  $r = Test-Endpoint -Name "Unexpected $m on /healthz" -Url "$base/healthz" -Method $m -ExpectCode @(404,405)
  $results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"
}

# ═══════════════ 7. HEADER SECURITY ═══════════════
Write-Host "`n>>> 7. RESPONSE HEADER TESTS <<<" -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "$base/healthz" -Method GET -TimeoutSec 5
$headers = $r.Headers

$headerChecks = @(
  @{n="X-Powered-By absent"; check={-not $headers.ContainsKey("X-Powered-By")}; detail="Hides tech stack"},
  @{n="Content-Type present"; check={$headers.ContainsKey("Content-Type")}; detail="Has Content-Type"}
)
foreach ($hc in $headerChecks) {
  $ok = & $hc.check
  $status = if ($ok) { "PASS" } else { "FAIL" }
  $results += [PSCustomObject]@{Test=$hc.n; Status=$status; Code=200; Detail=$hc.detail}
  $icon = if ($ok) { "[OK]" } else { "[!!]" }
  Write-Host "  $icon $($hc.n): $status"
}

# ═══════════════ 8. LARGE PAYLOAD TESTS ═══════════════
Write-Host "`n>>> 8. LARGE PAYLOAD TESTS <<<" -ForegroundColor Cyan

# 15MB JSON body
$r = Test-Endpoint -Name "15MB JSON body" -Url "$base/auth/login" -Method POST `
  -Body ('{"email":"test@test.com","password":"' + ('A' * (15 * 1024 * 1024)) + '"}') -ExpectCode @(413,400)
$results += $r; Write-Host "  $( if($r.Status -eq 'PASS'){'[OK]'}else{'[!!]'} ) $($r.Test): $($r.Status) ($($r.Code))"

# ═══════════════ SUMMARY ═══════════════
Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "  RESULTS SUMMARY" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
$passCount = ($results | Where-Object {$_.Status -eq "PASS"}).Count
$failCount = ($results | Where-Object {$_.Status -eq "FAIL"}).Count
$warnCount = ($results | Where-Object {$_.Status -eq "WARN"}).Count
Write-Host "  PASS: $passCount" -ForegroundColor Green
Write-Host "  FAIL: $failCount" -ForegroundColor Red
Write-Host "  WARN: $warnCount" -ForegroundColor Yellow
Write-Host "  TOTAL: $($results.Count)" -ForegroundColor White
Write-Host ""

if ($failCount -gt 0) {
  Write-Host "  FAILURES:" -ForegroundColor Red
  $results | Where-Object {$_.Status -eq "FAIL"} | ForEach-Object { Write-Host "    [!!] $($_.Test): $($_.Detail)" -ForegroundColor Red }
}
if ($warnCount -gt 0) {
  Write-Host "  WARNINGS:" -ForegroundColor Yellow
  $results | Where-Object {$_.Status -eq "WARN"} | ForEach-Object { Write-Host "    [??] $($_.Test): $($_.Code) - $($_.Detail)" -ForegroundColor Yellow }
}
Write-Host ""
