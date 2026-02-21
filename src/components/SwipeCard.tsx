"use client";

import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import type { WordItem } from "@/types/word";

type SwipeCardProps = {
  card: WordItem;
  onSwipeLeft: (card: WordItem) => void;
  onSwipeRight: (card: WordItem) => void;
  index?: number;
};

const SWIPE_THRESHOLD = 80;
const EXIT_VELOCITY = 500;

export function SwipeCard({
  card,
  onSwipeLeft,
  onSwipeRight,
  index = 0,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const leftOpacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [0.8, 0.4, 0]);
  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD, 200], [0, 0.4, 0.8]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (velocity > EXIT_VELOCITY || offset > SWIPE_THRESHOLD) {
      animate(x, 400, {
        type: "tween",
        duration: 0.2,
        onComplete: () => onSwipeRight(card),
      });
    } else if (velocity < -EXIT_VELOCITY || offset < -SWIPE_THRESHOLD) {
      animate(x, -400, {
        type: "tween",
        duration: 0.2,
        onComplete: () => onSwipeLeft(card),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={{
        x,
        rotate,
        zIndex: 100 - index,
      }}
      className="absolute inset-x-4 top-1/2 flex touch-none -translate-y-1/2 flex-col justify-center"
    >
      {/* 左スワイプ時の「まだ」オーバーレイ */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute -left-2 top-1/2 -translate-y-1/2 rounded-2xl px-4 py-2"
        aria-hidden
      >
        <span
          className="rounded-2xl px-4 py-2 text-lg font-bold text-amber-600"
          style={{ background: "var(--swipe-yet)" }}
        >
          まだ
        </span>
      </motion.div>

      {/* 右スワイプ時の「覚えた」オーバーレイ */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute -right-2 top-1/2 -translate-y-1/2"
        aria-hidden
      >
        <span
          className="rounded-2xl px-4 py-2 text-lg font-bold text-emerald-800"
          style={{ background: "var(--swipe-learned)" }}
        >
          覚えた
        </span>
      </motion.div>

      {/* カード本体 */}
      <motion.div
        className="flex flex-col gap-4 rounded-[28px] border border-cyan-100/60 p-8"
        style={{
          background: "var(--card-bg)",
          boxShadow: "var(--shadow-card)",
          minHeight: 200,
        }}
        whileTap={{ scale: 0.98 }}
      >
        <p className="text-center text-2xl font-bold tracking-tight text-teal-800">
          {card.spanish}
        </p>
        <p className="text-center text-lg text-stone-600">
          {card.japanese}
        </p>
      </motion.div>
    </motion.div>
  );
}
