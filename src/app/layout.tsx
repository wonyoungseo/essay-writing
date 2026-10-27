import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { THEMES } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

const serif = Noto_Serif_KR({
  weight: "variable",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-noto-serif-kr",
});

const sans = Noto_Sans_KR({
  weight: "variable",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: { default: "에세이 글쓰기", template: "%s · 에세이 글쓰기" },
  description: "서로의 글을 읽고, 마음에 남은 문장을 모으는 곳",
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return { themeColor: THEMES.find((t) => t.id === theme)!.themeColor };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    <html lang="ko" data-theme={theme} className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
