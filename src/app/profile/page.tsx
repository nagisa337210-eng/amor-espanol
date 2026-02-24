"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TabBar } from "@/components/TabBar";
import { User } from "lucide-react";
import { CHARACTERS, getCharacter } from "@/data/characters";
import type { CharacterId } from "@/data/characters";

const CHAT_STORAGE_PREFIX = "amor-espanol-chat-";
const PROFILE_NAME_KEY = "amor-espanol-profile-name";
const PROFILE_AVATAR_KEY = "amor-espanol-profile-avatar";

type ChatMessage = {
  role: "user" | "model";
  text: string;
  message?: string;
};

function loadHistory(characterId: CharacterId): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_PREFIX + characterId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** 全キャラの履歴を取得 */
function loadAllHistories(): Record<CharacterId, ChatMessage[]> {
  const entries = CHARACTERS.map((c) => [c.id, loadHistory(c.id)] as const);
  return Object.fromEntries(entries) as Record<CharacterId, ChatMessage[]>;
}

/** ユーザー発言テキストから単語（スペース区切り）を重複なくカウント */
function countDistinctWords(histories: Record<CharacterId, ChatMessage[]>): number {
  const words = new Set<string>();
  for (const msgs of Object.values(histories)) {
    for (const m of msgs) {
      if (m.role !== "user") continue;
      const text = (m.text ?? "").trim();
      text.split(/\s+/).forEach((w) => {
        const cleaned = w.replace(/^[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+|[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+$/g, "");
        if (cleaned) words.add(cleaned.toLowerCase());
      });
    }
  }
  return words.size;
}

const STAGES: { min: number; label: string }[] = [
  { min: 86, label: "Esposo" },
  { min: 71, label: "Prometido" },
  { min: 57, label: "Novio" },
  { min: 43, label: "Amigo especial" },
  { min: 29, label: "Amigo" },
  { min: 15, label: "Conocido" },
  { min: 0, label: "Desconocido" },
];

function scoreToStage(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  const found = STAGES.find((st) => s >= st.min);
  return found ? found.label : "Desconocido";
}

/** 会話履歴をGeminiに送り、親密度スコア 0〜100 を取得 */
async function fetchIntimacyScore(
  apiKey: string,
  characterName: string,
  messages: ChatMessage[]
): Promise<number> {
  const lines = messages.slice(-30).map((m) => {
    if (m.role === "user") return `Usuario: ${m.text}`;
    return `${characterName}: ${m.message ?? m.text}`;
  });
  const conversation = lines.join("\n");
  const prompt = `以下は2人の会話履歴です。関係性の親密度を0〜100のスコアでJSONのみ返してください。他の説明は不要です。\n形式: {"score": 75}\n\n会話:\n${conversation}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash-lite",
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim() ?? "";
  const match = text.match(/"score"\s*:\s*(\d+)/) || text.match(/\{\s*"score"\s*:\s*(\d+)\s*\}/);
  if (match) return Math.max(0, Math.min(100, parseInt(match[1], 10)));
  return 0;
}

function loadProfileName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PROFILE_NAME_KEY) ?? "";
}

function loadProfileAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_AVATAR_KEY);
}

export default function ProfilePage() {
  const [histories, setHistories] = useState<Record<CharacterId, ChatMessage[]> | null>(null);
  const [scores, setScores] = useState<Record<CharacterId, number | null>>(
    () =>
      Object.fromEntries(
        CHARACTERS.map((c) => [c.id, null as number | null])
      ) as Record<CharacterId, number | null>
  );
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileName(loadProfileName());
    setAvatarDataUrl(loadProfileAvatar());
  }, []);

  const wordCount = useMemo(() => {
    if (!histories) return 0;
    return countDistinctWords(histories);
  }, [histories]);

  useEffect(() => {
    const all = loadAllHistories();
    setHistories(all);

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const characterIds = CHARACTERS.map((c) => c.id);

    if (!apiKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      for (const id of characterIds) {
        if (cancelled) break;
        const msgs = all[id] ?? [];
        if (msgs.length === 0) {
          setScores((s) => ({ ...s, [id]: null }));
          continue;
        }
        const char = getCharacter(id);
        try {
          const score = await fetchIntimacyScore(apiKey, char?.name ?? id, msgs);
          if (!cancelled) setScores((s) => ({ ...s, [id]: score }));
        } catch {
          if (!cancelled) setScores((s) => ({ ...s, [id]: null }));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#e0f7fa] via-[#b2ebf2] to-[#e1f5fe]">
      <main className="flex flex-1 flex-col items-center px-6 pb-28 pt-8">
        <div
          className="flex w-full max-w-sm flex-col gap-6 rounded-[28px] border border-cyan-100/60 p-8"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 4px 20px rgba(77, 208, 225, 0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  setAvatarDataUrl(dataUrl);
                  try {
                    localStorage.setItem(PROFILE_AVATAR_KEY, dataUrl);
                  } catch {
                    // quota exceeded; data URL can be large
                  }
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-100/80 ring-2 ring-transparent transition hover:ring-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={32} className="text-cyan-500" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-stone-500">Perfil</p>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onBlur={() => {
                  try {
                    localStorage.setItem(PROFILE_NAME_KEY, profileName);
                  } catch {}
                }}
                placeholder="名前を入力"
                className="mt-0.5 w-full border-0 border-b border-cyan-200/80 bg-transparent pb-0.5 text-lg font-medium text-stone-700 placeholder:text-stone-400 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-cyan-100 pt-4">
            <p className="mb-3 text-sm font-medium text-teal-800">チャットで使った単語：{wordCount} 語</p>
          </div>

          <div className="border-t border-cyan-100 pt-4">
            <p className="mb-3 text-sm font-medium text-teal-800">関係性</p>
            <ul className="space-y-2">
              {CHARACTERS.map((c) => {
                const score = scores[c.id];
                const stage = score !== null && score !== undefined ? scoreToStage(score) : null;
                const hasHistory = (histories?.[c.id]?.length ?? 0) > 0;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-cyan-100/80 bg-white/80 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-stone-700">{c.name}</span>
                    <span className="text-sm text-teal-700">
                      {loading && hasHistory ? "…" : stage ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
      <TabBar />
    </div>
  );
}
