import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centinel",
  description: "Authentication starter built with Next.js, Prisma, and NextAuth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] font-sans text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
