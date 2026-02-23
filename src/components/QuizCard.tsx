"use client";

import { useState, useMemo } from "react";
import type { WordItem } from "@/types/word";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 正解1つ + 他単語から3つ選んでシャッフルした4択を返す */
function getChoices(current: WordItem, allWords: WordItem[]): string[] {
  const others = allWords.filter((w) => w.id !== current.id && w.japanese !== current.japanese);
  const wrongPool = [...new Set(others.map((w) => w.japanese))];
  const wrong: string[] = [];
  while (wrong.length < 3 && wrongPool.length > 0) {
    const i = Math.floor(Math.random() * wrongPool.length);
    wrong.push(wrongPool.splice(i, 1)[0]);
  }
  const four = [current.japanese, ...wrong].slice(0, 4);
  return shuffle(four);
}

export type QuizResult = "correct" | "wrong" | "not-confident";

type QuizCardProps = {
  word: WordItem;
  allWords: WordItem[];
  onNext: (result: QuizResult) => void;
};

export function QuizCard({ word, allWords, onNext }: QuizCardProps) {
  const choices = useMemo(() => getChoices(word, allWords), [word.id, allWords]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [answered, setAnswered] = useState<QuizResult | null>(null);
  const correctJapanese = word.japanese;

  function handleChoice(choice: string) {
    if (answered !== null) return;
    setSelected(choice);
    if (choice === correctJapanese) {
      setAnswered("correct");
      setTimeout(() => onNext("correct"), 400);
    } else {
      setShowCorrect(true);
      setAnswered("wrong");
      setTimeout(() => onNext("wrong"), 1500);
    }
  }

  function handleNotConfident() {
    // タップしても進めない。このあと4択で答えられる
  }

  return (
    <div
      className="flex flex-col gap-5 rounded-[28px] border border-cyan-100/60 p-6"
      style={{
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card)",
        minHeight: 200,
      }}
    >
      <p className="text-center text-2xl font-bold tracking-tight text-teal-800">
        {word.spanish}
      </p>
      <p className="text-center text-sm text-stone-500">意味を選んでください</p>
      <div className="grid grid-cols-1 gap-2">
        {choices.map((choice) => {
          const isCorrect = choice === correctJapanese;
          const isSelected = selected === choice;
          const highlightCorrect = showCorrect && isCorrect;
          const highlightWrong = isSelected && !isCorrect;

          let bg = "bg-white border-cyan-200/80 hover:bg-cyan-50/80";
          if (highlightCorrect) bg = "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300";
          if (highlightWrong) bg = "bg-red-50 border-red-300";
          if (isSelected && isCorrect) bg = "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300";

          return (
            <button
              key={choice}
              type="button"
              disabled={answered !== null}
              onClick={() => handleChoice(choice)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium text-stone-800 transition-colors disabled:pointer-events-none ${bg}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={answered !== null}
        onClick={handleNotConfident}
        className="mt-2 rounded-2xl border border-cyan-200/80 bg-white/80 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-cyan-50/80 disabled:pointer-events-none disabled:opacity-60"
      >
        自信なし
      </button>
    </div>
  );
}
