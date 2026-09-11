# Issue: CheckAnswerFunction を起点にフォルダ整理と責務分離を進める

## 背景

`CheckAnswerFunction` は HTTP の入口でありながら、認証、CORS、入力検証、回答判定、回答履歴保存、ユーザー進捗更新、エラーレスポンス生成を同じメソッド内で扱っている。

現状のフォルダ構成は大きく崩れていないが、`Functions` 層にユースケース処理と HTTP 共通処理が残っているため、変更理由が増えやすい。

## 目的

既存 API の挙動を変えずに、`CheckAnswerFunction` を薄くし、回答チェックのユースケースをサービス層へ移す。

## 対象

- `az305-api/Functions/CheckAnswer.cs`
- `az305-api/Functions/CorsHelper.cs`
- `az305-api/Program.cs`
- 必要に応じて `az305-api/Services/`

## 現状の課題

- `CheckAnswerFunction` が HTTP 処理とユースケース処理の両方を持っている
- `QuestionRepository.CheckAnswerAsync` と `GetChoiceIdAsync` の呼び出し順を Function が知っている
- 回答履歴保存とユーザー進捗更新という副作用を Function が直接実行している
- CORS、Cookie、エラー応答の責務が `CorsHelper` に集まり始めている
- static 呼び出しと DI 経由の呼び出しが混在している

## 方針

### 1. CheckAnswerService を追加する

候補:

```text
az305-api/Services/Quiz/CheckAnswerService.cs
```

責務:

- 回答を採点する
- 選択肢 ID を取得する
- セッション回答履歴を保存する
- ユーザー進捗を更新する
- 業務上の失敗理由を返す

### 2. CheckAnswerFunction を HTTP 入口に寄せる

Function に残す責務:

- CORS プリフライト処理
- 認証済みユーザー ID の取得
- リクエスト Body の読み込み
- `CheckAnswerService` の呼び出し
- サービス結果から HTTP レスポンスへの変換

### 3. HTTP 共通処理を整理する

`CorsHelper` は当面維持しつつ、以下の責務が増えすぎたら分離を検討する。

- CORS: `CorsHelper`
- Cookie: `CookieHelper` または `AuthRequestHelper`
- エラー応答: `ResponseHelper`

## 完了条件

- [ ] `CheckAnswerService` が追加されている
- [ ] `CheckAnswerFunction` から採点、選択肢 ID 取得、回答保存、進捗更新の詳細が消えている
- [ ] `CheckAnswerFunction` は HTTP 入出力の調整役になっている
- [ ] `Program.cs` に必要な DI 登録が追加されている
- [ ] 既存の `/api/check` のレスポンス形式が変わっていない
- [ ] `dotnet build az305-api/az305-api.sln --no-restore` が成功する

## 注意

この issue では大規模なフォルダ再編はしない。
まずは `CheckAnswerFunction` を起点に、1 つのユースケースサービスを追加する小さな変更に留める。
