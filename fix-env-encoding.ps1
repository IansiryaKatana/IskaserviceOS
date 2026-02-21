# Fix .env encoding for Supabase CLI (removes BOM and normalizes line endings)
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
  Write-Host ".env not found at $envPath"
  exit 1
}
$bytes = [System.IO.File]::ReadAllBytes($envPath)
# Remove UTF-8 BOM if present (EF BB BF)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $bytes = $bytes[3..($bytes.Length-1)]
  Write-Host "Removed UTF-8 BOM from .env"
}
$content = [System.Text.Encoding]::UTF8.GetString($bytes)
# Replace any non-ASCII variable-name chars that might cause parse errors (e.g. smart quotes, »)
$content = $content -replace '[\u201C\u201D\u201E\u201F\u2033\u2036]', '"'  # fancy double quotes
$content = $content -replace '[\u2018\u2019\u201A\u201B\u2032]', "'"       # fancy single quotes
$content = $content -replace '[\u00AB\u00BB]', ''                          # « and »
# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($envPath, $content, $utf8NoBom)
Write-Host "Saved .env as UTF-8 without BOM. Try: supabase functions deploy create-paypal-order"
Write-Host "supabase functions deploy capture-paypal-order"
