# リフレッシュトークンの確認スクリプト

$dbPath = "az305-api\Data\az305.db"

if (-Not (Test-Path $dbPath)) {
    Write-Host "❌ データベースが見つかりません: $dbPath" -ForegroundColor Red
    exit
}

Write-Host "✅ データベースを確認します..." -ForegroundColor Green

# SQLiteでクエリを実行
$query = @"
SELECT 
    id,
    user_id,
    substr(token, 1, 20) || '...' as token_preview,
    expires_at,
    created_at
FROM refresh_tokens
ORDER BY created_at DESC
LIMIT 5;
"@

try {
    # sqlite3がインストールされている場合
    $result = & sqlite3 $dbPath $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n📊 リフレッシュトークン一覧:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "⚠️ sqlite3コマンドが見つかりません" -ForegroundColor Yellow
        Write-Host "手動でDBを確認してください: $dbPath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ エラー: $_" -ForegroundColor Yellow
    Write-Host "`n代替方法：" -ForegroundColor Cyan
    Write-Host "1. DB Browser for SQLite をインストール" -ForegroundColor White
    Write-Host "2. $dbPath を開く" -ForegroundColor White
    Write-Host "3. refresh_tokens テーブルを確認" -ForegroundColor White
}
