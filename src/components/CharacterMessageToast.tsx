"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CharacterId } from "@/data/characters";

const PREVIEW_LEN = 60;

export function CharacterMessageToast({
  characterName,
  messagePreview,
  characterId,
  onDismiss,
}: {
  characterName: string;
  messagePreview: string;
  characterId: CharacterId;
  onDismiss: () => void;
}) {
  const preview =
    messagePreview.length > PREVIEW_LEN
      ? messagePreview.slice(0, PREVIEW_LEN - 3) + "..."
      : messagePreview;

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="mx-4 mt-2"
    >
      <Link
        href={`/chat?character=${characterId}`}
        onClick={onDismiss}
        className="relative z-[100] block cursor-pointer rounded-2xl rounded-tl-md border border-cyan-200/60 bg-white/95 px-4 py-3 shadow-lg transition-opacity hover:opacity-95 active:opacity-90 touch-manipulation"
        style={{ boxShadow: "0 4px 20px rgba(77, 208, 225, 0.25)" }}
      >
        <p className="text-xs font-semibold text-teal-700">{characterName}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-stone-700">{preview}</p>
      </Link>
    </motion.div>
  );
}
