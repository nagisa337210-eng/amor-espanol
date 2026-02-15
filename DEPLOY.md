# Amor Español - Vercel デプロイ手順

## 1. 前提

- GitHub にリポジトリがプッシュ済みであること
- [Vercel](https://vercel.com) アカウント（GitHub 連携推奨）

## 2. リポジトリを Vercel にインポート

1. [Vercel](https://vercel.com) にログイン
2. **「Add New…」→「Project」** をクリック
3. **「Import Git Repository」** で GitHub を選び、**nagisa337210-eng/amor-espanol** を選択
4. **「Import」** をクリック

## 3. 環境変数の設定（必須）

チャット機能（Gemini API）を使うには、環境変数を設定します。

1. プロジェクト設定画面の **「Environment Variables」** を開く
2. 以下を追加：

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | （Google AI Studio で発行した API キー） |

3. **Environment** は **Production / Preview / Development** のいずれか、または全部にチェック
4. **Save** をクリック

## 4. デプロイ

1. **「Deploy」** をクリック
2. ビルドが完了すると、**本番 URL**（例: `https://amor-espanol-xxx.vercel.app`）が発行されます
3. 以降、`main` ブランチにプッシュするたびに自動で再デプロイされます

## 5. オプション

- **カスタムドメイン**: Project Settings → Domains から設定可能
- **プレビュー環境**: プルリクエストごとにプレビュー URL が発行されます（同じ環境変数が使われます）

## トラブルシューティング

- **チャットで「APIキーが無効です」と出る**  
  → Vercel の Environment Variables に `NEXT_PUBLIC_GEMINI_API_KEY` が正しく設定されているか確認し、再デプロイしてください。
- **404 やモデルエラー**  
  → アプリ側で利用可能なモデルを自動取得しているため、通常は問題ありません。問題が続く場合は [Google AI Studio](https://aistudio.google.com) で API の利用状況を確認してください。
