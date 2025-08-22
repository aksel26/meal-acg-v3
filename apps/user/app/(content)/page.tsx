"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function ContentHomePage() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to dashboard as the default content page
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">환영합니다!</h1>
        <p className="text-gray-600 mt-2">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}
