"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, User } from "lucide-react";

export type TabId = "swipe" | "chat" | "profile";

const tabs: { id: TabId; label: string; href: string; icon: React.ReactNode }[] = [
  { id: "swipe", label: "Swipe（学習）", href: "/", icon: <BookOpen size={22} /> },
  { id: "chat", label: "Chat（実践）", href: "/chat", icon: <MessageCircle size={22} /> },
  { id: "profile", label: "Profile（進捗）", href: "/profile", icon: <User size={22} /> },
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-pink-200/50 bg-white/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
        boxShadow: "0 -4px 24px rgba(255, 182, 193, 0.18)",
      }}
    >
      {tabs.map(({ id, label, href, icon }) => {
        const isActive = activeTab === id;
        return (
          <Link
            key={id}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-3 transition-all duration-200 active:scale-95"
            style={{
              borderRadius: "var(--radius-md)",
              color: isActive ? "#e85d75" : "#b8958a",
            }}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange?.(id)}
          >
            <span className={isActive ? "opacity-100 drop-shadow-sm" : "opacity-70"}>
              {icon}
            </span>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
