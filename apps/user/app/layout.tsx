import { Sonner } from "@repo/ui/src/sonner";
import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata, Viewport } from "next";
import QueryProvider from "./providers/QueryProvider"; // 위에서 생성한 Provider 임포트
import { Analytics } from "@vercel/analytics/next";
// import { Geist } from "next/font/google";
import localFont from "next/font/local";

const APP_NAME = "🍙 ACG 식대";
const APP_DEFAULT_TITLE = "🍙 ACG 식대관리 서비스";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION = "ACG 직원을 위한 식대관리 서비스입니다.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  authors: [{ name: "김현민", url: "https://github.com/aksel26" }],
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    url: "https://meal-acg-v3-docs.vercel.app",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    locale: "ko_KR",
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
const myFont = localFont({
  src: "../fonts/NanumSquareNeo-Variable.ttf", // 'app/fonts/' 폴더의 폰트 파일 경로
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/ios/AppIcon@2x.png"></link>
      </head>
      <body className={myFont.className}>
        <QueryProvider>
          {children}
          <Analytics />
        </QueryProvider>
        <Sonner />
      </body>
    </html>
  );
}
