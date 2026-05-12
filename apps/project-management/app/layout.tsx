import { Sonner } from "@repo/ui/src/sonner";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@repo/ui/styles.css";
import "@xyflow/react/dist/style.css";

const APP_NAME = "ACG 프로젝트관리";
const APP_DEFAULT_TITLE = "ACG 프로젝트관리";
const APP_DESCRIPTION = "사내 프로젝트와 요청 업무 관리";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: "%s | 프로젝트관리",
  },
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Sonner />
      </body>
    </html>
  );
}
