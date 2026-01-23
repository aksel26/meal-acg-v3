import { Sonner } from "@repo/ui/src/sonner";
import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata, Viewport } from "next";
import QueryProvider from "./providers/QueryProvider";
import localFont from "next/font/local";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const APP_NAME = "ACG 식대 Admin";
const APP_DEFAULT_TITLE = "ACG 식대관리 Admin";
const APP_DESCRIPTION = "ACG 식대 관리자 시스템";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: "%s | Admin",
  },
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

const myFont = localFont({
  src: "./fonts/NanumSquareNeo-Variable.ttf",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={myFont.className}>
        <QueryProvider>{children}</QueryProvider>
        <Sonner />
      </body>
    </html>
  );
}
