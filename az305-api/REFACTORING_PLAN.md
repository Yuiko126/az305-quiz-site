# リファクタリング計画

## 1. 目的
API の挙動を変更せず、保守性・可読性・テスト容易性を向上させる。

## 2. 対象範囲
- Auth サービスと Auth 関連 Function
- Repository 層の重複とデータマッピングの一貫性
- HTTP リクエスト検証とレスポンス生成の再利用
- プロジェクト構成と DI 登録の整理

## 3. 非対象
- API 契約の変更は行わない（リクエスト/レスポンス JSON 互換を維持）
- 今回のリファクタリングでは DB スキーマ変更を行わない
- フロントエンドやインフラ移行は行わない

## 4. 現在の進捗
- AuthService の内部フローを小さな private メソッドへ分割済み
- Login/Register で入力正規化を導入済み
- Register の重複存在チェックを集約済み
- Login のタプル返却における null 許容性不一致を解消済み

## 5. 方針
- まず挙動を固定し、その上で構造改善する
- 小さく、差し戻し可能な変更を優先する
- 明示的な合意がない限り public シグネチャは変更しない
- 抽象化は重複の近くから段階的に行う
- 影響の大きい変更前に既存挙動のテストを追加する

## 6. 実施計画

### Phase A: Auth フロー整理
優先度: 高

作業内容:
- Login/Refresh で重複する Cookie ヘッダー生成を共通化
- Auth エラーレスポンスの形式とステータス処理を統一
- Auth リクエストの共通バリデーションフローを集約

対象候補ファイル:
- Functions/Auth/LoginFunction.cs
- Functions/Auth/RegisterFunction.cs
- Functions/Auth/RefreshFunction.cs
- Functions/CorsHelper.cs

完了条件:
- Auth エンドポイントのバリデーションエラー形式が統一される
- Cookie 設定ロジックが 1 箇所に集約される
- 成功/失敗時の HTTP ステータスに挙動差分がない

### Phase B: Repository 層の正規化
優先度: 高

作業内容:
- UserRepository の User マッピングを共通化
- Repository 境界でのメール正規化ルールを統一
- SQL コマンド構築の重複を可能な範囲で整理

対象候補ファイル:
- Services/Data/UserRepository.cs
- Services/Data/RefreshTokenRepository.cs
- Services/Data/SessionRepository.cs

完了条件:
- User マッピングが一元化され再利用される
- null/非アクティブユーザーの扱いがメソッド間で一貫する
- Repository メソッドが短く、レビューしやすい構造になる

### Phase C: Service と DTO 境界の明確化
優先度: 中

作業内容:
- ドメイン判断と HTTP 伝送責務を分離
- Service の成功/失敗状態をより明示的にする
- Function 側の匿名レスポンス構築を削減

対象候補ファイル:
- Services/Auth/AuthService.cs
- Dtos/Auth/LoginRequest.cs
- Dtos/Auth/RegisterRequest.cs
- Dtos/CheckResponse.cs

完了条件:
- Service がビジネスロジック中心になり副作用が分離される
- Function 層が最小限のオーケストレーションに収まる

### Phase D: クリーンアップと技術的負債解消
優先度: 中

作業内容:
- 文字化けコメントを解消し、エンコーディングを正規化
- 未使用コードと不要 using を削除
- 命名・フォーマット規約を統一

対象候補ファイル:
- Functions/Auth/RegisterFunction.cs
- Services/Auth/JwtTokenService.cs
- Program.cs

完了条件:
- 文字化けコメントが残っていない
- クリーンアップ起因の警告を増やさない

## 7. リスク管理
- リスク: Auth の境界ケースで意図しない挙動変更
  - 対策: 無効資格情報、非アクティブユーザー、トークン期限切れの回帰テスト追加
- リスク: 共通化のやり過ぎで可読性低下
  - 対策: 小さな PR 単位で段階的に適用
- リスク: レスポンス JSON の微差分発生
  - 対策: Auth エンドポイントの JSON スナップショット確認

## 8. 検証チェックリスト
- ビルドが成功する
- 既存エンドポイント契約を維持する
- 変更ファイルで新規 analyzer 警告を出さない
- Login/Register/Refresh/Logout の手動確認が通る

### 最新の実施結果（2026-05-27）
- `dotnet build` 成功
- Auth 手動回帰確認を実施（`Register -> Login -> Me -> Refresh -> Logout -> Me`）
- ステータス結果:
  - Register: `201`
  - Login: `200`（`access_token` / `refresh_token` Cookie 発行）
  - Me（ログイン後）: `200`
  - Refresh: `200`（Cookie 更新）
  - Logout: `200`（Cookie クリア）
  - Me（ログアウト後）: `401`
- JSON キー互換性:
  - Login: `user`
  - Refresh: `message`
  - Unauthorized: `error`
  - Me: `userId`, `userName`

## 9. 推奨実行順
1. 現行 Auth 挙動のベースラインテストを追加
2. Phase A（Auth 共通化）を完了
3. Phase B（Repository 一貫化）を完了
4. Phase C（Service/DTO 境界整理）を完了
5. Phase D（文字化け/命名/不要コード整理）を完了

## 10. 進捗トラッキング
進捗更新に使用する。

- [x] AuthService の初期内部分割
- [x] Phase A Auth フロー整理
- [x] Phase B Repository 層の正規化
- [x] Phase C Service/DTO 境界の明確化
- [x] Phase D クリーンアップと技術的負債解消

## 11. 次ステップ（優先順）
1. Auth 回帰確認の自動化（最優先）
  - xUnit などで `Register/Login/Refresh/Me/Logout` の API 契約テストを追加し、JSON キー互換を継続検証する。
2. エラー契約の統一テスト追加
  - `400/401/409/500` のレスポンス形（`error`, `errors`）を固定化する。
3. 運用観点の改善
  - `NETSDK1194` 警告の解消（`func start` 時のビルド経路見直し）と、必要最低限のログレベル整理を行う。