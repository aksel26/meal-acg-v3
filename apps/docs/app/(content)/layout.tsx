import React from "react";
import Header from "./page";
const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto">
      {/* 헤더 */}
      <Header />

      <main className="container mx-auto px-4 py-6 pb-[120px]! ">{children}</main>
    </div>
  );
};

export default layout;
