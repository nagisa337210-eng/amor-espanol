import type { Metadata } from "next";
import "./globals.css";
import { UnreadProvider } from "@/contexts/UnreadContext";

export const metadata: Metadata = {
  title: "Amor Español",
  description: "スペイン語学習アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <UnreadProvider>{children}</UnreadProvider>
      </body>
    </html>
  );
}
