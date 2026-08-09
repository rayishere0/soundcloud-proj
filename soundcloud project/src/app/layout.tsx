import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NotSoundcloud — Listen to free music",
  description:
    "NotSoundcloud is a music streaming platform that lets you discover, stream, and share a constantly expanding mix of music from emerging and major artists.",
  keywords: ["music", "streaming", "notsoundcloud", "audio", "playlists"],
  icons: {
    icon: "/notsoundcloud-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
