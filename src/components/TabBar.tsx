"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, User } from "lucide-react";
import { getUnreadIds } from "@/lib/unread";

export type TabId = "swipe" | "chat" | "profile";

const tabs: { id: TabId; label: string; href: string; icon: React.ReactNode }[] = [
  { id: "swipe", label: "Tarjeta", href: "/", icon: <BookOpen size={22} /> },
  { id: "chat", label: "Chat", href: "/chat", icon: <MessageCircle size={22} /> },
  { id: "profile", label: "Perfil", href: "/profile", icon: <User size={22} /> },
];

function getActiveTab(pathname: string): TabId {
  if (pathname === "/chat") return "chat";
  if (pathname === "/profile") return "profile";
  return "swipe";
}

export function TabBar({
  activeTab: activeTabOverride,
  onTabChange,
}: {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
} = {}) {
  const pathname = usePathname();
  const activeTab = activeTabOverride ?? getActiveTab(pathname ?? "/");
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const update = () => setHasUnread(getUnreadIds().length > 0);
    update();
    window.addEventListener("unread-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("unread-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-cyan-200/50 bg-white/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{
        boxShadow: "0 -4px 24px rgba(77, 208, 225, 0.15)",
      }}
    >
      {tabs.map(({ id, label, href, icon }) => {
        const isActive = activeTab === id;
        const showUnreadBadge = id === "chat" && hasUnread;
        return (
          <Link
            key={id}
            href={href}
            className="relative flex flex-1 flex-col items-center gap-1 py-3 transition-all duration-200 active:scale-95"
            style={{
              color: isActive ? "#c9a227" : "#5d9a9a",
            }}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange?.(id)}
          >
            <span className={`relative ${isActive ? "opacity-100 drop-shadow-sm" : "opacity-70"}`}>
              {icon}
              {showUnreadBadge && (
                <span
                  className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-red-500"
                  aria-label="未読あり"
                />
              )}
            </span>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
