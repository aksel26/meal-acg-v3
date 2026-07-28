import { Sonner } from "@repo/ui/src/sonner";
import type { Metadata } from "next";

import { CareersQueryProvider } from "../components/CareersQueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACG 채용 관리",
  description: "사내 채용 운영 관리",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <CareersQueryProvider>{children}</CareersQueryProvider>
        <Sonner />
      </body>
    </html>
  );
}
