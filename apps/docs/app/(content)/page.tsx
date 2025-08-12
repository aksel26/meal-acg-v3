"use client";
import Image from "next/image";
import React from "react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
const Header = () => {
  const { isHeaderVisible } = useHeaderVisibility({ threshold: 50, scrollDifference: 5 });
  return (
    <header className={`border-b bg-card sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="container mx-auto px-4 py-5 flex justify-center items-center">
        <Image src={LOGO} alt="CI" width={0} height={0} style={{ width: "60px", height: "20px" }} />
      </div>
    </header>
  );
};

export default Header;
