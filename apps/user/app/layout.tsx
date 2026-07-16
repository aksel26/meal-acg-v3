import { Sonner } from "@repo/ui/src/sonner";
import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata, Viewport } from "next";
import QueryProvider from "./providers/QueryProvider"; // 위에서 생성한 Provider 임포트
import { Analytics } from "@vercel/analytics/next";
import dayjs from "dayjs";

const APP_NAME = "ACG 식대";
const APP_DEFAULT_TITLE = "ACG 식대관리 서비스";
const APP_TITLE_TEMPLATE = "%s - ACG 식대";
const APP_DESCRIPTION = "ACG 직원을 위한 식대관리 서비스입니다.";
import "dayjs/locale/ko";
dayjs.locale("ko");

export const metadata: Metadata = {
  applicationName: APP_NAME,
  authors: [{ name: "김현민", url: "https://github.com/aksel26" }],
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          {children}
          <Analytics />
        </QueryProvider>
        <Sonner />
      </body>
    </html>
  );
}
