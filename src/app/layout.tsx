import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
