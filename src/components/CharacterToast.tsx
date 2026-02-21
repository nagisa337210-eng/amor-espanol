"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/** トースト用のキャラクター風メッセージ（2行想定） */
const TOAST_MESSAGES: { name: string; lines: [string, string] }[] = [
  { name: "Javi", lines: ["¡Buen trabajo! 💙", "Eso me encanta, de verdad."] },
  { name: "Alejandro", lines: ["Vas muy bien.", "Pásate por el chat cuando quieras."] },
  { name: "Mateo", lines: ["¡Mola! 🔥", "Sigue así, tío."] },
  { name: "Carlos", lines: ["Vas bien.", "Pásate por el chat cuando quieras."] },
  { name: "Diego", lines: ["Muy bien 🙂", "El jardín te espera."] },
];

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function CharacterToast({
  name,
  line1,
  line2,
  onComplete,
}: {
  name: string;
  line1: string;
  line2: string;
  onComplete: () => void;
}) {
  const maxLineLen = 28;
  const l1 = truncate(line1, maxLineLen);
  const l2 = truncate(line2, maxLineLen);

  useEffect(() => {
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="mx-4 mt-2 rounded-2xl rounded-tl-md border border-cyan-200/60 bg-white/95 px-4 py-3 shadow-lg"
      style={{ boxShadow: "0 4px 20px rgba(77, 208, 225, 0.25)" }}
    >
      <p className="text-xs font-semibold text-teal-700">{name}</p>
      <p className="mt-0.5 text-sm text-stone-700 line-clamp-2">
        {l1}
        {l2 ? `\n${l2}` : ""}
      </p>
    </motion.div>
  );
}

export function getRandomToastContent(): {
  name: string;
  line1: string;
  line2: string;
} {
  const item = TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)];
  return {
    name: item.name,
    line1: item.lines[0],
    line2: item.lines[1],
  };
}
