import { CHARACTERS } from "@/data/characters";
import type { CharacterId } from "@/data/characters";

const CHAT_STORAGE_PREFIX = "amor-espanol-chat-";

export type StoredChatMessage = {
  role: "user" | "model";
  text: string;
  evaluation?: string;
  message?: string;
  createdAt?: number;
};

function load(characterId: CharacterId): StoredChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_PREFIX + characterId);
    return raw ? (JSON.parse(raw) as StoredChatMessage[]) : [];
  } catch {
    return [];
  }
}

function save(characterId: CharacterId, messages: StoredChatMessage[]): void {
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

/** やりとりが1件以上あるキャラの id 一覧（報酬メッセージ送信先の候補） */
export function getCharacterIdsWithHistory(): CharacterId[] {
  return CHARACTERS.map((c) => c.id).filter(
    (id) => load(id).length > 0
  );
}

/** キャラのチャット履歴の末尾に1件追加する */
export function appendChatMessage(
  characterId: CharacterId,
  messageText: string
): void {
  const trimmed = (messageText ?? "").trim().replace(/^```\w*\n?|```$/g, "").trim();
  if (!trimmed) return;
  const messages = load(characterId);
  messages.push({
    role: "model",
    text: trimmed,
    message: trimmed,
    createdAt: Date.now(),
  });
  save(characterId, messages);
}
