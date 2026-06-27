import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS ZERO OS",
  description: "A complete operating system powered by Obsidian and AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-os-bg text-white antialiased">{children}</body>
    </html>
  );
}
