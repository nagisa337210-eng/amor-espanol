"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { TabBar } from "@/components/TabBar";
import { SwipeCard } from "@/components/SwipeCard";
import { CharacterToast, getRandomToastContent } from "@/components/CharacterToast";
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

/** 未学習の単語だけをシャッフルして初期カードを生成 */
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
  const [toast, setToast] = useState<ReturnType<typeof getRandomToastContent> | null>(null);
  const [toastId, setToastId] = useState(0);
  const rightSwipeCount = useRef(0);

  useEffect(() => {
    setCards(getInitialCards(words));
    setIsReady(true);
  }, []);

  const handleSwipeRight = useCallback((card: WordItem) => {
    saveLearnedId(card.id);
    rightSwipeCount.current += 1;
    if (rightSwipeCount.current % 10 === 0) {
      setToast(getRandomToastContent());
      setToastId((id) => id + 1);
    }
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }, []);

  const handleSwipeLeft = useCallback((card: WordItem) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }, []);

  const currentCard = cards[0];

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="fixed left-0 right-0 top-0 z-50 pt-[env(safe-area-inset-top)]"
      >
        <AnimatePresence mode="wait">
          {toast && (
            <CharacterToast
              key={toastId}
              name={toast.name}
              line1={toast.line1}
              line2={toast.line2}
              onComplete={() => setToast(null)}
            />
          )}
        </AnimatePresence>
      </div>
      <main className="flex flex-1 flex-col items-center pb-28 pt-8">
        <h1
          className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          <span className="text-2xl" aria-hidden>💙</span>
          Amor Español
        </h1>
        <p className="mb-5 text-sm text-stone-600">
          右：覚えた　／　左：まだ
        </p>

        <section className="relative h-[320px] w-full max-w-sm px-0">
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
            <>
              <p className="mb-2 text-center text-xs text-stone-500">
                残り {cards.length} 枚
              </p>
              <SwipeCard
                key={currentCard.id}
                card={currentCard}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            </>
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
