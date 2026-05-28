# リフレッシュトークン実装の総合テスト

Write-Host "🧪 リフレッシュトークン実装テスト" -ForegroundColor Cyan
Write-Host "=" * 50

# テスト1: ファイルの存在確認
Write-Host "`n✅ テスト1: 必要なファイルの存在確認" -ForegroundColor Green

$files = @(
    "az305-api\Services\Auth\JwtTokenService.cs",
    "az305-api\Functions\Auth\RefreshFunction.cs",
    "az305-api\Models\RefreshToken.cs",
    "az305-api\Data\schema.sql"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor White
    } else {
        Write-Host "  ✗ $file (見つかりません)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ 必要なファイルが不足しています" -ForegroundColor Red
    exit 1
}

# テスト2: schema.sqlにrefresh_tokensテーブルがあるか
Write-Host "`n✅ テスト2: schema.sqlの確認" -ForegroundColor Green

$schemaContent = Get-Content "az305-api\Data\schema.sql" -Raw
if ($schemaContent -match "CREATE TABLE.*refresh_tokens") {
    Write-Host "  ✓ refresh_tokensテーブルが定義されています" -ForegroundColor White
} else {
    Write-Host "  ✗ refresh_tokensテーブルが見つかりません" -ForegroundColor Red
    exit 1
}

# テスト3: JwtTokenServiceにGenerateRefreshTokenメソッドがあるか
Write-Host "`n✅ テスト3: JwtTokenServiceの確認" -ForegroundColor Green

$jwtContent = Get-Content "az305-api\Services\Auth\JwtTokenService.cs" -Raw
if ($jwtContent -match "GenerateRefreshToken") {
    Write-Host "  ✓ GenerateRefreshTokenメソッドが存在します" -ForegroundColor White
} else {
    Write-Host "  ✗ GenerateRefreshTokenメソッドが見つかりません" -ForegroundColor Red
    exit 1
}

# テスト4: RefreshFunctionが存在するか
Write-Host "`n✅ テスト4: RefreshFunctionの確認" -ForegroundColor Green

$refreshContent = Get-Content "az305-api\Functions\Auth\RefreshFunction.cs" -Raw
if ($refreshContent -match "ValidateRefreshTokenAsync") {
    Write-Host "  ✓ リフレッシュトークン検証ロジックが存在します" -ForegroundColor White
} else {
    Write-Host "  ✗ 検証ロジックが見つかりません" -ForegroundColor Red
    exit 1
}

# テスト5: DBの確認
Write-Host "`n✅ テスト5: データベースの確認" -ForegroundColor Green

$dbPath = "az305-api\Data\az305.db"
if (Test-Path $dbPath) {
    Write-Host "  ✓ データベースファイルが存在します: $dbPath" -ForegroundColor White
    Write-Host "  ℹ️  ログイン後、refresh_tokensテーブルにレコードが追加されているか確認してください" -ForegroundColor Yellow
} else {
    Write-Host "  ⚠️  データベースファイルがまだ作成されていません" -ForegroundColor Yellow
    Write-Host "     → Azure Functionsを起動すると自動作成されます" -ForegroundColor White
}

# 結果
Write-Host "`n" + ("=" * 50)
Write-Host "✅ すべての静的チェックが完了しました！" -ForegroundColor Green
Write-Host "`n次のステップ:" -ForegroundColor Cyan
Write-Host "1. Azure Functionsを起動: cd az305-api; func start" -ForegroundColor White
Write-Host "2. ブラウザでログイン" -ForegroundColor White
Write-Host "3. 開発者ツールでCookieを確認（access_token と refresh_token）" -ForegroundColor White
Write-Host "4. .\test-refresh-token.ps1 でDBを確認" -ForegroundColor White
