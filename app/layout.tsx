import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nevil’s Daily Round",
  description: "A private, local-first workspace for daily planning, clinical learning, MRCP revision and portfolio evidence.",
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
