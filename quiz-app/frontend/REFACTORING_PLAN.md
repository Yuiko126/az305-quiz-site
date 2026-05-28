# Refactoring Plan (quiz-app frontend)

最終更新: 2026-05-28

## 目的
- 型安全性の維持と API 通信経路の一貫化
- 画面責務の明確化と未使用コードの削減
- 小さな PR 単位での安全な改善

## 現況サマリー

| PR | 内容 | 状態 |
|---|---|---|
| PR-1 | 型/API 境界の統一 | 完了 |
| PR-2 | 認証通信の一本化（Login/Register を API 層経由） | 完了 |
| PR-3 | Dashboard 不整合の解消（未使用値・重複 style） | 完了 |
| PR-4 | Login バリデーション整合 | 完了 |
| PR-5 | Dashboard データ駆動化 | 保留（Dashboard 削除可能性を優先） |
| PR-6 | Header style キーの型安全化 | 完了 |
| PR-7 | ドキュメント同期（README / Plan） | 完了 |

## 直近で実施した変更
- Login 画面の API 呼び出しを `src/utils/api.ts` に統一
- Login/register の submit 条件を mode 別に分離
- Dashboard の重複 style と未使用値を整理
- Header の `styles` を厳密型に変更し `navTop` を明示定義

## 保留事項
- Dashboard は削除可能性があるため、追加改修は最小限に留める
- Dashboard 関連の大きな UI 改修は、削除有無が確定してから実施する

## 受け入れ基準（継続）
- [x] `npm run build` が成功する
- [ ] 主要画面（Login/Home/Quiz/Result/Dashboard）の手動回帰確認
- [ ] API エラー時の画面挙動確認

## 次の候補
1. Dashboard の存続方針を確定（残す/削除）
2. 存続する場合のみ Dashboard の責務整理を再開
3. 残す画面に対して回帰確認チェックリストを追加
