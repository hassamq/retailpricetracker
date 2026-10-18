import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { MainShell } from "@/components/layout/MainShell";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { brand } from "@/lib/brand";
import "./globals.css";

/** Geometric sans close to SamsungOne (licensed font not used). */
const samsungSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-samsung",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${brand.name} | Live Price Match & Comparison`,
  description: brand.subline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${samsungSans.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <Nav />
        <MainShell>{children}</MainShell>
        <Footer />
        <AssistantPanel />
      </body>
    </html>
  );
}
