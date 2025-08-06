"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * TanStack Query Provider 컴포넌트입니다.
 * 'use client'로 선언하여 클라이언트 측에서만 렌더링되도록 합니다.
 *
 * @param {object} props - 컴포넌트 프로퍼티
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState를 사용하여 QueryClient 인스턴스가 컴포넌트의 생명주기 동안
  // 단 한 번만 생성되도록 보장합니다.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // SSR 환경에서는 클라이언트에서 즉시 데이터를 다시 가져오는 것을 방지하기 위해
            // staleTime을 설정하는 것이 일반적입니다. (예: 1분)
            staleTime: 60 * 1000,
            // 쿼리 재시도 횟수
            retry: 1,
          },
        },
      })
  );

  return (
    // QueryClientProvider를 통해 앱 전체에 queryClient를 제공합니다.
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 Devtools를 렌더링합니다. */}
      <ReactQueryDevtools initialIsOpen={process.env.NODE_ENV === "development"} />
    </QueryClientProvider>
  );
}
