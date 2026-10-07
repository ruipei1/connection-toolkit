import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "From Perception to Connection",
  description: "A research-based toolkit for building social connection in college.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
