"use client";

import { TabBar } from "@/components/TabBar";
import { User } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#e0f7fa] via-[#b2ebf2] to-[#e1f5fe]">
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-8">
        <div
          className="flex flex-col items-center gap-4 rounded-[28px] border border-cyan-100/60 p-8 text-center"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 4px 20px rgba(77, 208, 225, 0.2)",
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100/80">
            <User size={32} className="text-cyan-500" />
          </div>
          <p className="text-lg font-medium text-stone-600">
            Profile（進捗）
          </p>
          <p className="text-sm text-stone-500">
            準備中です。お楽しみに！
          </p>
        </div>
      </main>
      <TabBar />
    </div>
  );
}
