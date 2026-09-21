# Vertical Slice Architecture への移行方針

## 背景

現在の `az305-api` は、以下のようなレイヤードアーキテクチャ寄りの構成になっている。

- `Functions` 層: HTTP の入口
- `Services` 層: 業務ロジック
- `Services/Data` 層: DB アクセス
- `Dtos` 層: 入出力モデル
- `Models` 層: ドメイン/永続モデル

この構成は初期開発では扱いやすいが、機能ごとの責務が横断的に分散しやすく、次の問題が出やすい。

- 「回答チェック」機能の処理が Function と Service と Repository にまたがる
- 1 つのユースケースの修正に複数のレイヤーを開く必要がある
- 機能追加時に、似た責務のコードが複数箇所に分散しやすい
- HTTP と業務ロジックの境界がユースケースごとに揺れやすい

今回の `CheckAnswer` の整理は、レイヤード分離をより強くするのではなく、機能ごとに閉じた構成へ寄せる整理の入口として扱う。

---

## 目標

`az305-api` 全体を、機能単位で閉じた構成に切り替える。

- 1 機能 1 フォルダ
- HTTP、アプリケーションロジック、永続化の実装が同じ機能内でまとまる
- 横断的な共通処理だけを最小限に残す
- 既存 API の動作は変えずに、構造だけを整理する

---

## 現在の問題

### 1. 機能の境界が薄い
`CheckAnswer` の場合、以下がそれぞれ別の場所に分かれている。

- `Functions/CheckAnswerFunction.cs`
- `Services/CheckAnswerService.cs`
- `Services/Data/QuestionRepository.cs`
- `Services/Data/SessionRepository.cs`
- `Dtos/CheckRequest.cs`
- `Dtos/CheckResponse.cs`

この構成だと、1 つのユースケースを理解するために複数のファイルを横断的に見る必要がある。

### 2. 機能ごとのコードが横断しやすい
例えば `CheckAnswer` の実装で、以下の責務が別々に存在する。

- HTTP 入出力
- JWT 認証
- CORS
- 業務ロジック
- DB 読み書き

この状態は「最小単位での理解はできるが、機能のまとまりとしては弱い」。

---

## Vertical Slice Architecture での方針

### 1. 機能ごとにフォルダを作る
以下のような構成へ整理する。

```text
az305-api/
  Features/
    CheckAnswer/
      CheckAnswerFunction.cs
      CheckAnswerService.cs
      CheckAnswerRequest.cs
      CheckAnswerResponse.cs
      CheckAnswerResult.cs
    StartSession/
      StartSessionFunction.cs
      StartSessionService.cs
      StartSessionRequest.cs
      StartSessionResult.cs
    SaveSession/
      SaveSessionFunction.cs
      SaveSessionService.cs
      SaveSessionRequest.cs
      SaveSessionResult.cs
    Auth/
      Login/
      Register/
      Refresh/
      Logout/
      Me/
  Shared/
    Infrastructure/
    Auth/
    Helpers/
    Extensions/
```

### 2. 1 機能 1 スライスの感覚でまとめる
1 スライスの中には、以下が近くに存在する。

- HTTP ハンドラ
- 入出力 DTO
- ユースケースサービス
- 必要に応じたバリデーション
- 業務結果モデル

これにより、1 機能を読むときにファイルをたくさん横断せずに済む。

### 3. 横断共通処理は最小化する
`CorsHelper` や `JwtTokenService` のような共通処理は残すが、次のルールを守る。

- 共通処理は「純粋な共通部品」に限定する
- 機能固有のロジックはスライス内に閉じ込める
- 1 ユースケースの実装が複数の横断層に分散しないようにする

---

## 具体的な移行対象

### まず最初に変える対象

1. `CheckAnswer`
   - `Functions/CheckAnswerFunction.cs`
   - `Services/CheckAnswerService.cs`
   - `Dtos/CheckRequest.cs`
   - `Dtos/CheckResponse.cs`

2. `StartSession`
   - `Functions/StartSession.cs`
   - `SessionRepository` とのやり取りをスライスに寄せる

3. `SaveSession`
   - `Functions/SaveSession.cs`
   - 既存の DTO と DB 保存ロジックを機能単位でまとめる

---

## 推奨する整理ルール

### 機能単位のコーディング原則

- 1 つの機能に関するすべてのファイルを 1 フォルダに集約する
- HTTP の具体的な入出力は、そのスライス内で完結させる
- Repository 呼び出しはスライスのサービスから行う
- その機能に依存しない共通処理だけを `Shared` 側に残す

### 例: CheckAnswer の最終イメージ

```text
Features/
  CheckAnswer/
    CheckAnswerFunction.cs
    CheckAnswerService.cs
    CheckAnswerRequest.cs
    CheckAnswerResponse.cs
    CheckAnswerResult.cs
```

`QuestionRepository` や `SessionRepository` は、同じ機能の中に見える形で使うか、必要に応じて `Shared/Infrastructure` に置く。

---

## 移行順序

### フェーズ1: 既存機能を1スライス化する
- `CheckAnswer` を最初に改修する
- Function と Service を同じ機能フォルダに寄せる
- API の振る舞いを変えずにファイル構成だけ整理する

### フェーズ2: 似た機能をまとめる
- `StartSession`
- `SaveSession`
- `Auth` 系の機能群

### フェーズ3: 共通処理を整理する
- `CorsHelper`
- `JwtTokenService`
- `DbService`
- `AppConstants`

共通部分は残すが、機能固有の処理をスライス内に閉じ込める。

---

## 期待効果

- 機能の修正箇所が 1 フォルダに収まる
- API ごとの責務が見えやすくなる
- レイヤー横断の依存が減る
- 新規機能追加時に、関連コードをまとめて作れる

---

## 注意点

この移行は「フォルダ構成の整理」であり、機能の振る舞いを一気に変えるものではない。

次の原則を守る。

- 既存 API のルートや JSON 形式は維持する
- HTTP の結果コードは変えない
- まずは整理だけで完了し、ロジックの大幅な改修は後続フェーズに分ける

---

## Functionの責務の基準

Vertical Slice Architecture において、Function は「外部との接点」を担当し、ユースケースの判断や業務ロジックはサービスに寄せるのが原則である。

### 1. Function に置くべきもの

Function には、HTTP に直接関係する責務だけを置く。

- HTTP リクエストの受信
- JSON の読み取り
- Cookie / Header / Query の取得
- CORS などの HTTP レイヤー処理
- 認証や認可の判定
- `HttpRequestData` から DTO への変換
- Service の呼び出し
- `HttpResponseData` へのマッピング
- HTTP ステータスコードの設定

つまり、Function は「入口と出口」に限定する。

### 2. Function に置かないほうがよいもの

次のような処理は Function に持たせない。

- 問題の正誤判定
- 事業ルールに基づく判断
- 状態遷移やドメイン条件の判定
- DB 参照、更新、整合性チェック
- 複数のリポジトリをまたぐユースケース制御
- 同じ判断が別の入口でも必要になる業務ロジック

これらは、サービスやアプリケーション層に分離したほうが保守しやすい。

### 3. 判断基準

境界の目安は以下の 3 点で判断する。

#### 3.1 HTTP に依存しているか

HTTP に依存するものは Function に置く。

- `req.ReadFromJsonAsync<T>()`
- `HttpRequestData`
- `HttpResponseData`
- Cookie の取得
- 401 / 400 / 500 の応答生成

これらは業務ロジックではなく、API の接続部分である。

#### 3.2 業務判断を含んでいるか

業務判断やルール適用は Function ではなく Service に置く。

- 問題が見つからない場合
- 選択肢が不正かどうか
- 正解かどうか
- セッション状態が許可されているか
- 進捗更新を行うべきかどうか

この種のロジックは、HTTP を意識しない形で表現するべきである。

#### 3.3 再利用可能か

複数の Function から使う可能性があるロジックは Service として切り出す。

Function に閉じたロジックは 1 つの入口に依存しやすく、テストも難くなる。

### 4. 具体例: CheckAnswer

Function 側に適する処理:

```csharp
var token = _corsHelper.GetCookieValue(req, "access_token");
if (string.IsNullOrEmpty(token))
{
    return _corsHelper.UnauthorizedResponse(req);
}

var body = await req.ReadFromJsonAsync<CheckRequest>();
var result = await _checkAnswerService.ExecuteAsync(userId, body);

return result.IsSuccess
    ? _corsHelper.OkResponse(req, response)
    : _corsHelper.BadRequestResponse(req, result.Message);
```

Service 側に適する処理:

```csharp
if (question == null)
    return CheckAnswerResult.QuestionNotFound();

if (!question.IsValidChoice(selected))
    return CheckAnswerResult.InvalidChoice();

if (question.CorrectChoiceId != selected)
    return CheckAnswerResult.Incorrect();

return CheckAnswerResult.Correct();
```

この分離により、Function は HTTP と認証を担当し、Service は業務判断を担当する。これが責務の境界である。

### 5. 実務上のルール

最も簡潔な判断基準は次の通りである。

- HTTP を扱う → Function
- 業務の意味を決める → Service
- 永続化や DB アクセス → Repository / Infrastructure

この境界を守ることで、1 機能の理解、変更、テストがしやすくなる。

### 6. まとめ

Vertical Slice Architecture では、Function を「境界の出口」レベルに留めることが重要である。

Function は HTTP と認証を扱い、Service はユースケースの判断を担う。これにより、各スライスが自己完結し、横断的な責務の混在を避けられる。

---


