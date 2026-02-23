const KEY = "amor-espanol-unread";

export function getUnreadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function setUnread(id: string) {
  const ids = getUnreadIds();
  if (!ids.includes(id)) localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  window.dispatchEvent(new Event("unread-change"));
}

export function markRead(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getUnreadIds().filter((i) => i !== id)));
  window.dispatchEvent(new Event("unread-change"));
}
