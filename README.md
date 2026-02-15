# Amor Español 💕

スペイン人男性と仲良くなるための、実践的なスペイン語学習アプリです。

- **Swipe（学習）**: 1000語の単語カードをスワイプで覚える（右：覚えた / 左：まだ）。進捗はブラウザに保存。
- **Chat（実践）**: 5人のキャラ（Javi, Alejandro, Mateo, Carlos, Diego）とスペイン語でチャット。文法修正・情熱的言い回し・返信を Gemini API で取得。
- **Profile（進捗）**: 準備中。

## 技術スタック

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Framer Motion, Lucide React, @google/generative-ai

## 開発

```bash
npm install
npm run dev
```

`.env.local` に `NEXT_PUBLIC_GEMINI_API_KEY` を設定するとチャットが利用できます。

## デプロイ（Vercel）

詳細は **[DEPLOY.md](./DEPLOY.md)** を参照してください。GitHub リポジトリを Vercel にインポートし、環境変数 `NEXT_PUBLIC_GEMINI_API_KEY` を設定してデプロイします。

---

## GitHub リポジトリと初回プッシュ

- リポジトリ: **https://github.com/nagisa337210-eng/amor-espanol**（Private）

**初回コミットとプッシュ（ターミナルで実行）**
```bash
cd amor-espanol
chmod +x scripts/git-push-initial.sh
./scripts/git-push-initial.sh
```
リモートが未設定の場合は以下を実行してから `git push -u origin main` を実行してください。
```bash
git remote add origin https://github.com/nagisa337210-eng/amor-espanol.git
# または SSH: git remote add origin git@github.com:nagisa337210-eng/amor-espanol.git
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
