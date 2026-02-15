"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CHARACTERS, buildSystemPrompt, getCharacter } from "@/data/characters";
import type { CharacterId } from "@/data/characters";
import { TabBar } from "@/components/TabBar";
import { MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";

const CHAT_STORAGE_PREFIX = "amor-espanol-chat-";

export type ChatMessage = {
  role: "user" | "model";
  text: string;
  /** モデル返信時のみ: 文法修正 */
  correction?: string;
  /** モデル返信時のみ: 情熱的言い回し提案 */
  passionate?: string;
  /** モデル返信時のみ: キャラのメッセージ本文 */
  message?: string;
};

function parseGeminiResponse(text: string): {
  correction: string;
  passionate: string;
  message: string;
} {
  const correction =
    text.match(/【修正】\s*([\s\S]*?)(?=【情熱的】|$)/)?.[1]?.trim() || "";
  const passionate =
    text.match(/【情熱的】\s*([\s\S]*?)(?=【メッセージ】|$)/)?.[1]?.trim() || "";
  const message =
    text.match(/【メッセージ】\s*([\s\S]*?)$/)?.[1]?.trim() || text;
  return { correction, passionate, message };
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

export default function ChatPage() {
  const [characterId, setCharacterId] = useState<CharacterId>("javi");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const character = getCharacter(characterId);

  useEffect(() => {
    setMessages(loadHistory(characterId));
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
        { role: "user", text: trimmed },
        {
          role: "model",
          text: "APIキーが設定されていません。.env.local を確認してください。",
          message: "APIキーが設定されていません。",
        },
      ]);
      setInput("");
      return;
    }

    const userMessage: ChatMessage = { role: "user", text: trimmed };
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

          const { correction, passionate, message } = parseGeminiResponse(fullText);

          const modelMessage: ChatMessage = {
            role: "model",
            text: fullText,
            correction: correction || undefined,
            passionate: passionate || undefined,
            message: message || fullText,
          };

          const updated = [...newMessages, modelMessage];
          setMessages(updated);
          saveHistory(characterId, updated);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: errorText,
          message: errorText,
        },
      ]);
      saveHistory(characterId, [...newMessages, { role: "model", text: errorText, message: errorText }]);
    } finally {
      setLoading(false);
    }
  }, [input, character, characterId, loading, messages]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#ffe4ec] via-[#ffd6b8] to-[#ffecd2]">
      <header className="sticky top-0 z-10 border-b border-pink-200/50 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-center gap-1 px-2 py-3">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCharacterId(c.id)}
              className="flex flex-col items-center rounded-2xl p-2 transition-all active:scale-95"
              style={{
                background:
                  characterId === c.id
                    ? "rgba(255, 181, 197, 0.5)"
                    : "transparent",
                border:
                  characterId === c.id
                    ? "2px solid rgba(232, 93, 117, 0.6)"
                    : "2px solid transparent",
              }}
              title={`${c.name} (${c.nameJa})`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow"
                style={{
                  background:
                    characterId === c.id
                      ? "linear-gradient(135deg, #e85d75, #ff9a9e)"
                      : "linear-gradient(135deg, #b8958a, #d4a5a5)",
                }}
              >
                {c.name.slice(0, 1)}
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

      <main className="flex-1 overflow-hidden px-3 pb-32 pt-4">
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
              <div key={i} className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #a8e6cf, #88d4ab)",
                    color: "#1a4d3a",
                  }}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {msg.text}
                  </p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl rounded-bl-md bg-white/95 px-4 py-2.5 shadow-sm"
                    style={{
                      border: "1px solid rgba(255, 182, 193, 0.4)",
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm text-stone-800">
                      {msg.message ?? msg.text}
                    </p>
                  </div>
                  {(msg.correction || msg.passionate) && (
                    <div className="mt-1.5 rounded-xl bg-white/80 px-3 py-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expandedId === i ? null : i)
                        }
                        className="flex w-full items-center gap-1 text-left text-pink-700"
                      >
                        {expandedId === i ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                        修正・言い回し
                      </button>
                      {expandedId === i && (
                        <div className="mt-2 space-y-2 border-t border-pink-100 pt-2">
                          {msg.correction && (
                            <div>
                              <span className="font-medium text-amber-800">
                                【修正】
                              </span>
                              <p className="mt-0.5 text-stone-600">
                                {msg.correction}
                              </p>
                            </div>
                          )}
                          {msg.passionate && (
                            <div>
                              <span className="font-medium text-rose-700">
                                【情熱的】
                              </span>
                              <p className="mt-0.5 text-stone-600">
                                {msg.passionate}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md bg-white/95 px-4 py-2.5"
                style={{
                  border: "1px solid rgba(255, 182, 193, 0.4)",
                }}
              >
                <span className="text-sm text-stone-400">...</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 入力欄：常にタブバーの上に表示 */}
      <div
        className="fixed left-0 right-0 z-40 border-t border-pink-200/50 bg-white/95 px-3 pt-3 backdrop-blur-md"
        style={{
          bottom: "5.5rem",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="スペイン語でメッセージ..."
            className="flex-1 rounded-2xl border border-pink-200 bg-pink-50/80 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #e85d75, #ff9a9e)",
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
