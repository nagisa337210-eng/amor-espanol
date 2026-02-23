import type { CharacterId } from "@/data/characters";

const UNREAD_KEY = "amor-espanol-unread";

export function getUnreadCharacterIds(): CharacterId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UNREAD_KEY);
    return raw ? (JSON.parse(raw) as CharacterId[]) : [];
  } catch {
    return [];
  }
}

export function setUnread(characterId: CharacterId): void {
  if (typeof window === "undefined") return;
  const ids = getUnreadCharacterIds();
  if (ids.includes(characterId)) return;
  localStorage.setItem(UNREAD_KEY, JSON.stringify([...ids, characterId]));
  window.dispatchEvent(new Event("amor-espanol-unread-change"));
}

export function markRead(characterId: CharacterId): void {
  if (typeof window === "undefined") return;
  const ids = getUnreadCharacterIds().filter((id) => id !== characterId);
  localStorage.setItem(UNREAD_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("amor-espanol-unread-change"));
}

export function hasAnyUnread(): boolean {
  return getUnreadCharacterIds().length > 0;
}
