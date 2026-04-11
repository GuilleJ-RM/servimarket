$base = "http://localhost:3001/api"
$results = @()
$tmpDir = "d:\RMsoluciones\servimarket"

function Write-Body($name, $content) {
  $path = Join-Path $tmpDir "tmp_test_$name.json"
  [System.IO.File]::WriteAllText($path, $content)
  return $path
}

function Test-Code($Name, $Url, $Method="GET", $BodyFile=$null, $OkCodes=@(200,400,401,403,404,413,429)) {
  $args2 = @("-s","-o","NUL","-w","%{http_code}","-X",$Method)
  if ($BodyFile) { $args2 += @("-H","Content-Type: application/json","-d","@$BodyFile") }
  $args2 += $Url
  $code = [int](& curl.exe @args2)
  $status = if ($code -in $OkCodes) { "PASS" } else { "FAIL" }
  return [PSCustomObject]@{Test=$Name; Status=$status; Code=$code}
}

function Test-Content($Name, $Url, $BadPattern) {
  $content = & curl.exe -s $Url
  $bad = $content -match $BadPattern
  return [PSCustomObject]@{Test=$Name; Status=$(if($bad){"FAIL"}else{"PASS"}); Code="---"}
}

function Print-Result($r) {
  $icon = if ($r.Status -eq "PASS") { "[OK]" } elseif ($r.Status -eq "FAIL") { "[!!]" } else { "[??]" }
  Write-Host "  $icon $($r.Test) ($($r.Code))"
}

Write-Host ""
Write-Host "============================================"
Write-Host "  FULL SECURITY RETEST (post-fix)"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================"
Write-Host ""

# 1. SQL INJECTION
Write-Host ">>> 1. SQL INJECTION <<<"
$r = Test-Code "SQLi: OR 1=1" "$base/listings?search=%27%20OR%201%3D1%20--"; $results += $r; Print-Result $r
$r = Test-Code "SQLi: UNION SELECT" "$base/listings?search=%27%20UNION%20SELECT%20%2A%20FROM%20users%20--"; $results += $r; Print-Result $r
$r = Test-Code "SQLi: DROP TABLE" "$base/jobs?search=%27%3B%20DROP%20TABLE%20users%3B%20--"; $results += $r; Print-Result $r
$r = Test-Code "SQLi: numeric categoryId" "$base/listings?categoryId=1%20OR%201%3D1"; $results += $r; Print-Result $r
$bf = Write-Body "sqli_login" '{"email":"admin@test.com OR 1=1","password":"x"}'
$r = Test-Code "SQLi: login email injection" "$base/auth/login" "POST" $bf; $results += $r; Print-Result $r

# 2. AUTH BYPASS (no cookie)
Write-Host ""
Write-Host ">>> 2. AUTH BYPASS (no cookie) <<<"
foreach ($ep in @("bookings","conversations","admin/users","admin/listings","admin/jobs","admin/stats","jobs/my","listings/my","cvs/public","auth/me")) {
  $r = Test-Code "GET /$ep no auth" "$base/$ep" "GET" $null @(401,403)
  $results += $r; Print-Result $r
}
$postTests = @(
  @{n="POST /bookings"; b='{"listingId":1}'; f="ab1"},
  @{n="POST /listings"; b='{"title":"x"}'; f="ab2"},
  @{n="POST /upload/image"; b='{"image":"x"}'; f="ab3"}
)
foreach ($pt in $postTests) {
  $bf = Write-Body $pt.f $pt.b
  $r = Test-Code $pt.n "$base/$($pt.n.Split(' ')[1].TrimStart('/'))" "POST" $bf @(401,403)
  $results += $r; Print-Result $r
}

# 3. XSS
Write-Host ""
Write-Host ">>> 3. XSS PAYLOADS <<<"
foreach ($p in @("%3Cscript%3Ealert(1)%3C%2Fscript%3E","%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E","javascript%3Aalert(1)","%22%3E%3Csvg%20onload%3Dalert(1)%3E")) {
  $r = Test-Content "XSS in search" "$base/listings?search=$p" "<script>|onerror=|onload=|javascript:"
  $results += $r; Print-Result $r
}

# 4. INPUT VALIDATION
Write-Host ""
Write-Host ">>> 4. INPUT VALIDATION <<<"
foreach ($id in @("abc","0","-1","99999999","1.5","null","NaN")) {
  $r = Test-Code "Invalid listing ID: $id" "$base/listings/$id"; $results += $r; Print-Result $r
}
$regTests = @(
  @{n="Register: missing email"; b='{"password":"test123","name":"Test","role":"client"}'; f="rv1"},
  @{n="Register: missing password"; b='{"email":"newqa@test.com","name":"Test","role":"client"}'; f="rv2"},
  @{n="Register: missing name"; b='{"email":"newqa@test.com","password":"test123","role":"client"}'; f="rv3"},
  @{n="Register: short password"; b='{"email":"newqa@test.com","password":"12","name":"Test","role":"client"}'; f="rv4"},
  @{n="Register: invalid email"; b='{"email":"not-an-email","password":"test123","name":"Test","role":"client"}'; f="rv5"}
)
foreach ($rt in $regTests) {
  $bf = Write-Body $rt.f $rt.b
  $r = Test-Code $rt.n "$base/auth/register" "POST" $bf @(400)
  $results += $r; Print-Result $r
}
$bf = Write-Body "empty_body" '{}'
$r = Test-Code "Login: empty body" "$base/auth/login" "POST" $bf; $results += $r; Print-Result $r
$bf = Write-Body "invalid_json" 'not-json'
$r = Test-Code "Login: invalid JSON" "$base/auth/login" "POST" $bf @(400); $results += $r; Print-Result $r

# 5. PATH TRAVERSAL
Write-Host ""
Write-Host ">>> 5. PATH TRAVERSAL <<<"
$r = Test-Code "Path traversal: .." "$base/../../../etc/passwd"; $results += $r; Print-Result $r
$r = Test-Code "Null byte" "$base/listings/test%00.json"; $results += $r; Print-Result $r

# 6. RESPONSE HEADERS
Write-Host ""
Write-Host ">>> 6. RESPONSE HEADERS <<<"
$hdrs = & curl.exe -s -D - -o NUL "$base/healthz"
$xpb = $hdrs -match "(?i)X-Powered-By"
$ct = $hdrs -match "(?i)Content-Type"
$r = [PSCustomObject]@{Test="X-Powered-By absent"; Status=$(if(-not $xpb){"PASS"}else{"FAIL"}); Code="---"}; $results += $r; Print-Result $r
$r = [PSCustomObject]@{Test="Content-Type present"; Status=$(if($ct){"PASS"}else{"FAIL"}); Code="---"}; $results += $r; Print-Result $r

# 7. LARGE PAYLOAD
Write-Host ""
Write-Host ">>> 7. LARGE PAYLOAD <<<"
$bigStr = "A" * (12 * 1024 * 1024)
$bigPath = Join-Path $tmpDir "tmp_big_body.json"
[System.IO.File]::WriteAllText($bigPath, "{`"email`":`"t@t.com`",`"password`":`"$bigStr`"}")
$r = Test-Code "12MB JSON body" "$base/auth/login" "POST" $bigPath @(400,413)
$results += $r; Print-Result $r

# 8. CORS
Write-Host ""
Write-Host ">>> 8. CORS <<<"
$corsHdrs = & curl.exe -s -D - -o NUL -H "Origin: http://evil.com" "$base/healthz"
$evil = $corsHdrs -match "http://evil.com"
$r = [PSCustomObject]@{Test="CORS rejects evil origin"; Status=$(if(-not $evil){"PASS"}else{"FAIL"}); Code="---"}; $results += $r; Print-Result $r

# SUMMARY
Write-Host ""
Write-Host "============================================"
Write-Host "  FINAL RESULTS"
Write-Host "============================================"
$pass = ($results | Where-Object {$_.Status -eq "PASS"}).Count
$fail = ($results | Where-Object {$_.Status -eq "FAIL"}).Count
$warn = ($results | Where-Object {$_.Status -eq "WARN"}).Count
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor Red
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host "  TOTAL: $($results.Count)"
Write-Host ""
if ($fail -gt 0) {
  Write-Host "  FAILURES:" -ForegroundColor Red
  $results | Where-Object {$_.Status -eq "FAIL"} | ForEach-Object { Write-Host "    [!!] $($_.Test) ($($_.Code))" -ForegroundColor Red }
}
Write-Host ""

# Cleanup tmp files
Get-ChildItem -Path $tmpDir -Filter "tmp_test_*" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $tmpDir -Filter "tmp_big_*" | Remove-Item -Force -ErrorAction SilentlyContinue
