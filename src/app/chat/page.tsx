"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CHARACTERS, buildSystemPrompt, getCharacter } from "@/data/characters";
import type { CharacterId } from "@/data/characters";
import { TabBar } from "@/components/TabBar";
import { MessageCircle, Send } from "lucide-react";
import { getUnreadIds, markRead } from "@/lib/unread";

const VALID_CHARACTER_IDS: CharacterId[] = ["javi", "alejandro", "mateo", "carlos", "diego"];

const CHAT_STORAGE_PREFIX = "amor-espanol-chat-";

export type ChatMessage = {
  role: "user" | "model";
  text: string;
  /** モデル返信時のみ: キャラのメッセージ本文 */
  message?: string;
  /** 投稿日時（ms）。表示用 mm/dd 時:分 */
  createdAt?: number;
};

/** 投稿日時を mm/dd HH:mm で表示 */
function formatMessageTime(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

function parseGeminiResponse(text: string): { message: string } {
  // 【メッセージ】や【mensaje】は表示しない：除去して本文だけ返す
  const message = text
    .replace(/【(?:メッセージ|mensaje)】\s*/gi, "")
    .trim();
  return { message: message || text.trim() };
}

/** メッセージを複数バブル用に分割（||| 区切り、なければ改行2つ、なければそのまま1つ） */
function splitIntoBubbles(message: string): string[] {
  const trimmed = message.trim();
  if (!trimmed) return [];
  if (trimmed.includes("|||")) {
    return trimmed.split("|||").map((s) => s.trim()).filter(Boolean);
  }
  const byDoubleNewline = trimmed.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (byDoubleNewline.length > 1) return byDoubleNewline;
  return [trimmed];
}

function randomDelay(min = 500, max = 1000): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

function loadHistory(characterId: CharacterId): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_PREFIX + characterId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(characterId: CharacterId, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CHAT_STORAGE_PREFIX + characterId,
      JSON.stringify(messages)
    );
  } catch {
    // ignore
  }
}

/** API から利用可能なモデル一覧を取得し、generateContent 対応の ID を返す */
async function getAvailableModelIds(apiKey: string): Promise<string[]> {
  const envModel = process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim();
  if (envModel) return [envModel];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const models = data?.models ?? [];
    const ids = models
      .filter(
        (m) =>
          m.name &&
          m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m) => (m.name!.startsWith("models/") ? m.name!.slice(7) : m.name!))
      .filter(Boolean);
    if (ids.length > 0) return ids;
  } catch {
    // ignore
  }
  return [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
  ];
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const characterParam = searchParams.get("character");
  const initialId = characterParam && VALID_CHARACTER_IDS.includes(characterParam as CharacterId)
    ? (characterParam as CharacterId)
    : "javi";

  const [characterId, setCharacterId] = useState<CharacterId>(initialId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const character = getCharacter(characterId);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);

  useEffect(() => {
    const id = characterParam && VALID_CHARACTER_IDS.includes(characterParam as CharacterId)
      ? (characterParam as CharacterId)
      : "javi";
    setCharacterId(id);
    markRead(id);
  }, [characterParam]);

  useEffect(() => {
    setMessages(loadHistory(characterId));
    markRead(characterId);
  }, [characterId]);

  useEffect(() => {
    const update = () => setUnreadIds(getUnreadIds());
    update();
    window.addEventListener("unread-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("unread-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // ?character= で開いたときは最新の履歴を確実に読む（クイズ報酬メッセージなど）
  useEffect(() => {
    if (!characterParam) return;
    const id = VALID_CHARACTER_IDS.includes(characterParam as CharacterId)
      ? (characterParam as CharacterId)
      : null;
    if (id) setMessages(loadHistory(id));
  }, [characterParam]);

  // タブに戻ったとき・通知から開いたときも localStorage から再読み込み（クイズ報酬を確実に表示）
  useEffect(() => {
    const reload = () => setMessages(loadHistory(characterId));
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("pageshow", reload); // 通知タップで同じURLに遷移したときも再読込
    return () => {
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("pageshow", reload);
    };
  }, [characterId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !character || loading) return;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: trimmed, createdAt: Date.now() },
        {
          role: "model",
          text: "APIキーが設定されていません。.env.local を確認してください。",
          message: "APIキーが設定されていません。",
          createdAt: Date.now(),
        },
      ]);
      setInput("");
      return;
    }

    const userMessage: ChatMessage = { role: "user", text: trimmed, createdAt: Date.now() };
    const newMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // 利用可能なモデルを API から取得し、使えるものを順に試す
      const modelIds = await getAvailableModelIds(apiKey);

      const historyForGemini = newMessages
        .filter((m) => m.role === "user" || (m.role === "model" && m.message))
        .slice(-20)
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.role === "user" ? m.text : (m.message ?? m.text) }],
        }));

      let lastError: unknown;
      let success = false;
      for (const modelId of modelIds) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelId,
            systemInstruction: buildSystemPrompt(character),
          });
          const chat = model.startChat({
            history: historyForGemini.slice(0, -1),
          });
          const result = await chat.sendMessage(trimmed);
          const response = result.response;
          const fullText = response.text() ?? "";

          const { message } = parseGeminiResponse(fullText);
          const bubbles = splitIntoBubbles(message || fullText);
          const finalMessages: ChatMessage[] = [...newMessages];

          for (let i = 0; i < bubbles.length; i++) {
            await randomDelay(500, 1000);
            finalMessages.push({
              role: "model",
              text: fullText,
              message: bubbles[i],
              createdAt: Date.now(),
            });
            setMessages([...finalMessages]);
          }
          saveHistory(characterId, finalMessages);
          success = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!success && lastError) throw lastError;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const isInvalidKey =
        rawMessage.includes("API key not valid") ||
        rawMessage.includes("API_KEY_INVALID") ||
        rawMessage.includes("INVALID_ARGUMENT");
      const errorText = isInvalidKey
        ? "APIキーが無効です。.env.local の NEXT_PUBLIC_GEMINI_API_KEY を、Google AI Studio (aistudio.google.com) で発行した新しいキーに置き換えて、アプリを再起動してください。"
        : rawMessage || "エラーが発生しました";
      const errMsg: ChatMessage = {
        role: "model",
        text: errorText,
        message: errorText,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
      saveHistory(characterId, [...newMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, character, characterId, loading, messages]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#e0f7fa] via-[#b2ebf2] to-[#e1f5fe]">
      <header className="sticky top-0 z-10 border-b border-cyan-200/50 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-center gap-1 px-2 py-3">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCharacterId(c.id);
                markRead(c.id);
              }}
              className="relative flex flex-col items-center rounded-2xl p-2 transition-all active:scale-95"
              style={{
                background:
                  characterId === c.id
                    ? "rgba(255, 181, 197, 0.5)"
                    : "transparent",
                border:
                  characterId === c.id
                    ? "2px solid rgba(0, 121, 107, 0.6)"
                    : "2px solid transparent",
              }}
              title={c.name}
            >
              <div
                className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full text-lg font-bold text-white shadow"
                style={{
                  background:
                    c.id === "javi" ||
                    c.id === "carlos" ||
                    c.id === "alejandro" ||
                    c.id === "diego" ||
                    c.id === "mateo"
                      ? "transparent"
                      : characterId === c.id
                        ? "linear-gradient(135deg, #00796b, #4dd0e1)"
                        : "linear-gradient(135deg, #80deea, #b2ebf2)",
                }}
              >
                {c.id === "javi" ? (
                  <img
                    src="/images/javi.png?v=2"
                    alt={c.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 25%" }}
                  />
                ) : c.id === "carlos" ? (
                  <img
                    src="/images/carlos.png"
                    alt={c.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 20%" }}
                  />
                ) : c.id === "alejandro" ? (
                  <img
                    src="/images/alejandro.png"
                    alt={c.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 25%" }}
                  />
                ) : c.id === "diego" ? (
                  <img
                    src="/images/diego.png"
                    alt={c.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 25%" }}
                  />
                ) : c.id === "mateo" ? (
                  <img
                    src="/images/mateo.png"
                    alt={c.name}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 5%" }}
                  />
                ) : (
                  c.name.slice(0, 1)
                )}
                {unreadIds.includes(c.id) && (
                  <span
                    className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500"
                    aria-label="未読"
                  />
                )}
              </div>
              <span className="mt-1 text-xs font-medium text-stone-600">
                {c.nameJa}
              </span>
            </button>
          ))}
        </div>
        {character && (
          <p className="pb-2 text-center text-xs text-stone-500">
            {character.name} / {character.age}歳 / {character.jobJa}
          </p>
        )}
      </header>

      <main className="flex-1 overflow-hidden px-3 pb-40 pt-4">
        <div
          ref={listRef}
          className="flex h-full flex-col gap-3 overflow-y-auto"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-stone-500">
              <MessageCircle size={40} className="opacity-50" />
              <p className="text-sm">
                {character?.nameJa}にスペイン語でメッセージを送ってみよう
              </p>
            </div>
          )}
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex flex-col items-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #b2ebf2, #80deea)",
                    color: "#0d4d47",
                  }}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {msg.text}
                  </p>
                </div>
                {msg.createdAt != null && (
                  <span className="mt-0.5 text-xs text-stone-500">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                )}
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start">
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl rounded-bl-md bg-white/95 px-4 py-2.5 shadow-sm"
                    style={{
                      border: "1px solid rgba(77, 208, 225, 0.4)",
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm text-stone-800">
                      {msg.message ?? msg.text}
                    </p>
                  </div>
                </div>
                {msg.createdAt != null && (
                  <span className="mt-0.5 text-xs text-stone-500">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                )}
              </div>
            )
          )}
          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md bg-white/95 px-4 py-2.5"
                style={{
                  border: "1px solid rgba(77, 208, 225, 0.4)",
                }}
              >
                <span className="text-sm text-stone-500">Escribiendo…</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 入力欄：常にタブバーの上に表示 */}
      <div
        className="fixed left-0 right-0 z-40 border-t border-cyan-200/50 bg-white/95 px-3 pt-3 pb-2 backdrop-blur-md"
        style={{
          bottom: "calc(4.125rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="スペイン語でメッセージ..."
            className="flex-1 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
style={{ fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #00796b, #4dd0e1)",
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#e0f7fa] via-[#b2ebf2] to-[#e1f5fe]">
          <div className="flex flex-1 items-center justify-center text-stone-500">
            読み込み中…
          </div>
          <TabBar />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
