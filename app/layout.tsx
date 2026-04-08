import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediGenie UI",
  description: "Modern healthcare chatbot UI with chat, voice, image upload, and audio playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
