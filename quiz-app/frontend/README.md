# quiz-app frontend

AZ-305 学習アプリのフロントエンドです。React + TypeScript + Vite で構成されています。

## 前提

- Node.js 20 以上
- バックエンド API（Azure Functions）がローカルで起動していること
  - 既定: `http://localhost:7071`

## 環境変数

`.env` に以下を設定します。

```env
VITE_API_BASE=http://localhost:7071/api
```

## セットアップ

```bash
npm install
```

## 開発起動

```bash
npm run dev
```

既定のフロント URL は `http://localhost:5173` です。

## ビルド

```bash
npm run build
```

## プレビュー

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## 補足

- 認証は Cookie ベースです。
- API 呼び出しは `src/utils/api.ts` を経由する方針です。
- 401 応答時は `src/utils/api.ts` 内で refresh を試行します。
