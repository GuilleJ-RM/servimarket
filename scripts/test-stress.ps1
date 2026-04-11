$base = "http://localhost:3001/api"

Write-Host ""
Write-Host "============================================"
Write-Host "  LOAD & STRESS TEST"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================"
Write-Host ""

function Stress-Endpoint {
  param($Name, $Url, $Concurrent, $TotalReqs)

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $jobs = @()
  $completed = 0
  $errors = 0
  $codes = @{}
  $times = @()

  # Run in batches of $Concurrent
  $batches = [Math]::Ceiling($TotalReqs / $Concurrent)

  for ($b = 0; $b -lt $batches; $b++) {
    $batchSize = [Math]::Min($Concurrent, $TotalReqs - ($b * $Concurrent))
    $batchJobs = @()

    for ($i = 0; $i -lt $batchSize; $i++) {
      $batchJobs += Start-Job -ScriptBlock {
        param($u)
        $rsw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
          $code = & curl.exe -s -o NUL -w "%{http_code}" $u
          $rsw.Stop()
          return @{Code=[int]$code; Ms=$rsw.ElapsedMilliseconds; Error=$false}
        } catch {
          $rsw.Stop()
          return @{Code=0; Ms=$rsw.ElapsedMilliseconds; Error=$true}
        }
      } -ArgumentList $Url
    }

    # Wait for batch
    $batchJobs | Wait-Job | Out-Null
    foreach ($j in $batchJobs) {
      $r = Receive-Job -Job $j
      $completed++
      if ($r.Error) { $errors++ }
      $code = $r.Code
      if ($codes.ContainsKey($code)) { $codes[$code]++ } else { $codes[$code] = 1 }
      $times += $r.Ms
    }
    $batchJobs | Remove-Job -Force
  }
  $sw.Stop()

  $sortedTimes = $times | Sort-Object
  $avg = ($times | Measure-Object -Average).Average
  $p50 = $sortedTimes[[Math]::Floor($sortedTimes.Count * 0.5)]
  $p95 = $sortedTimes[[Math]::Floor($sortedTimes.Count * 0.95)]
  $p99 = $sortedTimes[[Math]::Floor($sortedTimes.Count * 0.99)]
  $minT = ($times | Measure-Object -Minimum).Minimum
  $maxT = ($times | Measure-Object -Maximum).Maximum
  $rps = [Math]::Round($TotalReqs / ($sw.ElapsedMilliseconds / 1000), 1)

  Write-Host "  $Name" -ForegroundColor Cyan
  Write-Host "    Requests: $TotalReqs concurrent:$Concurrent total_time:$($sw.ElapsedMilliseconds)ms"
  Write-Host "    RPS: $rps   Errors: $errors"
  Write-Host "    Latency - avg:$([Math]::Round($avg))ms p50:${p50}ms p95:${p95}ms p99:${p99}ms min:${minT}ms max:${maxT}ms"
  Write-Host "    Status codes: $($codes.GetEnumerator() | ForEach-Object { "$($_.Key):$($_.Value)" } | Sort-Object)"
  Write-Host ""

  return [PSCustomObject]@{
    Name=$Name; Total=$TotalReqs; Concurrent=$Concurrent;
    RPS=$rps; Errors=$errors; AvgMs=[Math]::Round($avg);
    P50=$p50; P95=$p95; P99=$p99; MaxMs=$maxT
  }
}

$stressResults = @()

# 1. Health endpoint - baseline
Write-Host ">>> Phase 1: Baseline (GET /healthz) <<<"
$stressResults += Stress-Endpoint "GET /healthz" "$base/healthz" 10 50

# 2. Listings - read endpoint
Write-Host ">>> Phase 2: Listings (GET /listings) <<<"
$stressResults += Stress-Endpoint "GET /listings" "$base/listings" 10 50

# 3. Search with params
Write-Host ">>> Phase 3: Search (GET /listings?search=test) <<<"
$stressResults += Stress-Endpoint "GET /listings?search=test" "$base/listings?search=test" 10 50

# 4. Single listing
Write-Host ">>> Phase 4: Single listing (GET /listings/4) <<<"
$stressResults += Stress-Endpoint "GET /listings/4" "$base/listings/4" 10 50

# 5. Categories
Write-Host ">>> Phase 5: Categories (GET /categories) <<<"
$stressResults += Stress-Endpoint "GET /categories" "$base/categories" 10 50

# 6. Higher concurrency - GET /healthz
Write-Host ">>> Phase 6: High concurrency healthz (20 concurrent, 100 total) <<<"
$stressResults += Stress-Endpoint "GET /healthz (high)" "$base/healthz" 20 100

# 7. Higher concurrency - GET /listings
Write-Host ">>> Phase 7: High concurrency listings (20 concurrent, 100 total) <<<"
$stressResults += Stress-Endpoint "GET /listings (high)" "$base/listings" 20 100

# SUMMARY
Write-Host "============================================"
Write-Host "  STRESS TEST SUMMARY"
Write-Host "============================================"
Write-Host ""
$stressResults | Format-Table Name, Total, Concurrent, RPS, AvgMs, P50, P95, P99, MaxMs, Errors -AutoSize
Write-Host ""

# Check for issues
$issueCount = 0
foreach ($r in $stressResults) {
  if ($r.Errors -gt 0) {
    Write-Host "[!!] $($r.Name): $($r.Errors) errors!" -ForegroundColor Red
    $issueCount++
  }
  if ($r.P95 -gt 2000) {
    Write-Host "[!!] $($r.Name): P95 latency > 2s ($($r.P95)ms)" -ForegroundColor Red
    $issueCount++
  }
  if ($r.MaxMs -gt 5000) {
    Write-Host "[!!] $($r.Name): Max latency > 5s ($($r.MaxMs)ms)" -ForegroundColor Yellow
    $issueCount++
  }
}
if ($issueCount -eq 0) {
  Write-Host "All stress tests passed!" -ForegroundColor Green
}
