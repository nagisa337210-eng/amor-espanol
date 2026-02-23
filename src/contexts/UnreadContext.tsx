"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { CharacterId } from "@/data/characters";
import {
  getUnreadCharacterIds,
  setUnread as setUnreadStorage,
  markRead as markReadStorage,
} from "@/lib/unread";

type UnreadContextValue = {
  unreadIds: CharacterId[];
  setUnread: (id: CharacterId) => void;
  markRead: (id: CharacterId) => void;
  hasAnyUnread: boolean;
};

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadIds, setUnreadIds] = useState<CharacterId[]>([]);

  const refresh = useCallback(() => {
    setUnreadIds(getUnreadCharacterIds());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("amor-espanol-unread-change", onChange);
    return () => window.removeEventListener("amor-espanol-unread-change", onChange);
  }, [refresh]);

  const setUnread = useCallback((id: CharacterId) => {
    setUnreadStorage(id);
    setUnreadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markRead = useCallback((id: CharacterId) => {
    markReadStorage(id);
    setUnreadIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const hasAnyUnread = unreadIds.length > 0;

  return (
    <UnreadContext.Provider
      value={{ unreadIds, setUnread, markRead, hasAnyUnread }}
    >
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread(): UnreadContextValue {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used within UnreadProvider");
  return ctx;
}
