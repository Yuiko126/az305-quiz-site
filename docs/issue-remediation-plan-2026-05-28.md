# 問題点修正計画（2026-05-28）

## 1. 目的
- 現在確認済みの不整合を、リスクの高い順に解消する。
- 1 PR = 1 目的を徹底し、レビューしやすい差分で段階的に修正する。
- 既存 API 契約と主要画面フロー（Login -> Home -> Quiz -> Result -> Dashboard）を壊さない。

## 2. 優先度ルール
- P0: セキュリティ/運用事故につながる。
- P1: ユーザー影響または将来バグを高確率で誘発する。
- P2: 品質・保守性の改善（中期的な効果）。

## 3. 問題点一覧（優先度付き）

| ID | 優先度 | 問題 | 主な対象 |
|---|---|---|---|
| SEC-001 | P0 | JWT シークレットが local.settings.json に平文で存在 | az305-api/local.settings.json |
| ARC-001 | P1 | Login が共通 API 層を使わず直接 fetch（通信経路が二重化） | quiz-app/frontend/src/pages/Login.tsx |
| FE-001 | P1 | Dashboard に未使用変数・重複 style 指定が残存 | quiz-app/frontend/src/pages/Dashboard.tsx |
| FE-002 | P1 | Login の submit 可否判定が register 要件と不整合 | quiz-app/frontend/src/pages/Login.tsx |
| FE-003 | P1 | Dashboard に固定ダミー値（ユーザー名・残日数）が残存 | quiz-app/frontend/src/pages/Dashboard.tsx |
| FE-004 | P2 | Header の styles が index signature で欠落キー検知不能 | quiz-app/frontend/src/components/Header.tsx |
| DOC-001 | P2 | frontend README がテンプレート文面のまま | quiz-app/frontend/README.md |
| PM-001 | P2 | 既存 REFACTORING_PLAN の完了チェックと実装実態に乖離 | quiz-app/frontend/REFACTORING_PLAN.md |
| BE-001 | P2 | Dbservice.cs の命名ゆれ（DbService との不一致） | az305-api/Services/Dbservice.cs |

## 4. フェーズ計画（PR 粒度）

### PR-1（P0）Secrets 安全化
目的:
- ソース管理上のシークレット露出を止める。

対象:
- az305-api/local.settings.json
- az305-api/local.settings.json.example（新規）
- 必要に応じて docs 配下

変更内容:
- local.settings.json の実鍵をプレースホルダへ置換。
- 開発者向けサンプル設定ファイルを追加。
- ローカル起動手順にシークレット設定方法を明記。

完了条件:
- リポジトリ上に実シークレットが残っていない。
- 新規開発者が .example から起動設定できる。

確認:
- dotnet build
- Login/Refresh 動作確認（環境変数設定後）

---

### PR-2（P1）認証通信の一本化（Login/Register）
目的:
- 認証周りの通信経路を utils/api.ts に統一し、挙動の一貫性を確保する。

対象:
- quiz-app/frontend/src/pages/Login.tsx
- quiz-app/frontend/src/utils/api.ts

変更内容:
- Login.tsx の直接 fetch を login/register API 関数呼び出しに置換。
- エラーメッセージ処理を UI 側責務として統一。
- URL 直書きを削除（VITE_API_BASE 依存に統一）。

完了条件:
- Login.tsx に直接 fetch が残っていない。
- ログイン/登録が既存動作を維持。

確認:
- npm run build
- 手動: login/register 成功・失敗ケース

---

### PR-3（P1）Dashboard 不整合修正（即効性バグ対応）
目的:
- 目に見える実装不整合を除去し、将来のバグ混入を防ぐ。

対象:
- quiz-app/frontend/src/pages/Dashboard.tsx

変更内容:
- 重複 style 指定の解消。
- 未使用 props/変数の整理（使うか削るかを明確化）。
- コメントアウトされた死蔵ブロックを整理。

完了条件:
- Dashboard で未使用変数・重複プロパティが解消。
- UI 見た目が回帰しない。

確認:
- npm run build
- 画面確認: Dashboard

---

### PR-4（P1）Login バリデーション整合
目的:
- register 時の入力要件と submit 可否判定を一致させる。

対象:
- quiz-app/frontend/src/pages/Login.tsx

変更内容:
- mode=login/register でボタン活性条件を分離。
- register 時に username/confirmPassword 一致を submit 条件へ反映。
- エラー表示文言を mode ごとに整える。

完了条件:
- register で不正入力時に submit 不可または適切エラー。
- login の挙動が従来通り。

確認:
- npm run build
- 手動: register バリデーション

---

### PR-5（P1）Dashboard のデータ駆動化
目的:
- 固定ダミー値を実データに置き換え、画面信頼性を上げる。

対象:
- quiz-app/frontend/src/pages/Dashboard.tsx
- quiz-app/frontend/src/App.tsx（必要最小限）

変更内容:
- 固定のユーザー名・日数表示を props/計算値へ移行。
- 代替表示（データ未取得時）を明示。

完了条件:
- ダミー文字列が本番表示ロジックから除去される。
- データなし時も UI が破綻しない。

確認:
- npm run build
- 手動: ログインユーザー表示、日数表示

---

### PR-6（P2）Header 型安全性改善
目的:
- styles の欠落キーを静的検知できる状態にする。

対象:
- quiz-app/frontend/src/components/Header.tsx

変更内容:
- styles 型を厳格化（必要キーの明示）。
- navTop/navBottom など利用キーを型で担保。

完了条件:
- 存在しない style キー参照が型エラーになる。
- UI 表示の回帰なし。

確認:
- npm run build

---

### PR-7（P2）ドキュメント同期
目的:
- 実装と計画/README の乖離を解消し、運用の信頼性を回復する。

対象:
- quiz-app/frontend/README.md
- quiz-app/frontend/REFACTORING_PLAN.md
- 必要に応じて docs

変更内容:
- 現在の構成・起動手順・環境変数を README に反映。
- REFACTORING_PLAN の完了ステータスを実態準拠へ更新。

完了条件:
- 新規参加者が README のみで起動可能。
- 計画書の完了チェックが現状コードと一致。

確認:
- README 記載手順で起動確認

---

### PR-8（P2）Backend 命名一貫性
目的:
- 命名ゆれを解消し探索性を改善する。

対象:
- az305-api/Services/Dbservice.cs -> DbService.cs
- 参照箇所（必要時）

変更内容:
- ファイル名をクラス名に一致させる。
- 影響範囲を最小化して参照整合を確認。

完了条件:
- ビルド成功。
- 参照切れなし。

確認:
- dotnet build

## 5. 実行順（推奨）
1. PR-1（Secrets）
2. PR-2（認証通信一本化）
3. PR-3（Dashboard 不整合）
4. PR-4（Login バリデーション）
5. PR-5（Dashboard データ駆動化）
6. PR-6（Header 型安全）
7. PR-7（ドキュメント同期）
8. PR-8（Backend 命名）

## 6. 進捗管理テンプレート
- Status: Not Started / In Progress / In Review / Done
- Scope: 変更ファイル一覧
- Risk: 影響範囲と回帰懸念
- Validation: 実施した build/test/manual check

## 7. 実施ログ
- 2026-05-28 PR-1 着手/完了（ローカル設定の平文シークレット無害化、example 追加）
- 2026-05-28 PR-2 着手/完了（Login/Register の直接 fetch を utils/api.ts 経由に統一）
- 2026-05-28 PR-3 着手/完了（Dashboard の未使用値・重複 style・死蔵コメントを整理）
- 2026-05-28 PR-4 着手/完了（Login の mode 別 submit 条件と register 入力検証を整合）
- 2026-05-28 PR-5 方針変更（Dashboard 削除可能性を優先し、追加改修は保留。最小差分で App 側の受け渡し拡張を戻し、現行仕様維持）
- 2026-05-28 PR-6 着手/完了（Header の styles を厳密型へ変更し、navTop キーを明示定義）
- 2026-05-28 PR-7 着手/完了（frontend README を実装準拠へ更新、frontend REFACTORING_PLAN を現況同期）
- 2026-05-28 PR-8 着手/完了（Dbservice.cs を DbService.cs へリネームし命名一貫性を確保）

---

最終更新: 2026-05-28
