"use client";

import { useState, useCallback, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { QuizCard } from "@/components/QuizCard";
import type { WordItem } from "@/types/word";
import wordsData from "@/data/words.json";

const STORAGE_KEY = "amor-espanol-learned";

/** localStorage に保存された「覚えた」単語の id 一覧を取得 */
function getLearnedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

/** 「覚えた」として単語 id を localStorage に追加 */
function saveLearnedId(id: number): void {
  const ids = getLearnedIds();
  if (ids.includes(id)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
}

/** Fisher-Yates で配列をシャッフル */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 未学習の単語だけをシャッフルしてクイズ用リストを生成 */
function getInitialCards(allWords: WordItem[]): WordItem[] {
  if (typeof window === "undefined") return [];
  const learned = getLearnedIds();
  const remaining = allWords.filter((w) => !learned.includes(w.id));
  return shuffle(remaining);
}

const words = wordsData as WordItem[];

export default function Home() {
  const [cards, setCards] = useState<WordItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);

  useEffect(() => {
    setCards(getInitialCards(words));
    setLearnedCount(getLearnedIds().length);
    setIsReady(true);
  }, []);

  const handleNext = useCallback((result: "correct" | "wrong" | "not-confident", card: WordItem) => {
    if (result === "correct") {
      saveLearnedId(card.id);
      setLearnedCount(getLearnedIds().length);
      setCards((prev) => prev.slice(1));
    } else {
      setCards((prev) => {
        const rest = prev.slice(1);
        const pos = Math.floor(Math.random() * (rest.length + 1));
        return [...rest.slice(0, pos), card, ...rest.slice(pos)];
      });
    }
  }, []);

  const currentCard = cards[0];
  const progressTotal = words.length;
  const progressCurrent = learnedCount;

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center pb-28 pt-8">
        <p className="mb-3 mt-2 text-center text-sm font-medium text-teal-700">
          {progressCurrent} / {progressTotal}
        </p>

        <section className="relative w-full max-w-sm px-0">
          {!isReady ? (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-[28px] p-8 text-center"
              style={{
                background: "var(--card-bg)",
                boxShadow: "var(--shadow-card)",
                minHeight: 200,
              }}
            >
              <p className="text-lg font-medium text-stone-600">
                読み込み中...
              </p>
            </div>
          ) : currentCard ? (
            <QuizCard
              key={currentCard.id}
              word={currentCard}
              allWords={words}
              onNext={(result) => handleNext(result, currentCard)}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-4 rounded-[28px] p-8 text-center"
              style={{
                background: "var(--card-bg)",
                boxShadow: "var(--shadow-card)",
                minHeight: 200,
              }}
            >
              <p className="text-2xl" aria-hidden>✨</p>
              <p className="text-lg font-medium text-stone-600">
                今日のカードはここまで！
              </p>
              <p className="text-sm text-stone-500">
                また明日も頑張ろう
              </p>
              {typeof window !== "undefined" && getLearnedIds().length > 0 && (
                <p className="text-xs text-teal-600/80">
                  覚えた単語：{getLearnedIds().length} 語
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <TabBar />
    </div>
  );
}
