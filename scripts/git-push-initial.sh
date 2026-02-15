#!/bin/bash
# Amor Español - 初回コミットと GitHub へのプッシュ
# リポジトリ: https://github.com/nagisa337210-eng/amor-espanol（Private）

set -e
cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial commit: Amor Español - Next.js with TypeScript, Tailwind, ESLint"
  echo "✓ 初回コミットを作成しました"
else
  echo ".git は既に存在します。未コミットの変更を追加してコミットします。"
  git add .
  git status
  git diff --cached --quiet && echo "変更がありません。" || git commit -m "Update: Amor Español"
fi

if ! git remote get-url origin 2>/dev/null; then
  echo ""
  echo "リモートを追加するには、以下のいずれかを実行してください（USERNAME をあなたの GitHub ユーザー名に置き換え）。"
  echo "  git remote add origin https://github.com/nagisa337210-eng/amor-espanol.git"
  echo "  git remote add origin git@github.com:nagisa337210-eng/amor-espanol.git"
  echo ""
  echo "その後、プッシュ:"
  echo "  git branch -M main && git push -u origin main"
  exit 0
fi

git branch -M main 2>/dev/null || true
echo "プッシュしています..."
git push -u origin main
echo "✓ GitHub へのプッシュが完了しました"
