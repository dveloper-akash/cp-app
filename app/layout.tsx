import Background from "@/components/Background";
import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`relative min-h-screen font-sans overflow-hidden ${inter.className}`}>
        <Background />
        {children}
      </body>
    </html>
  );
}
