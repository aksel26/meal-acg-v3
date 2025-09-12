"use client";

import { Card, CardHeader, CardTitle } from "@repo/ui/src/card";
import { motion } from "motion/react";
import Image from "next/image";
import { formatDateKorean } from "utils";

interface GreetingSectionProps {
  userName: string;
}

export default function GreetingSection({ userName }: GreetingSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className="mb-4 border-none shadow-none">
        <CardHeader>
          <CardTitle>
            <div className="flex space-x-2 items-center mb-2">
              <p className="text-base sm:text-lg text-foreground font-medium">안녕하세요, {userName}님 </p>
              <Image src={"/icons/greeting.png"} alt={"greeting"} width={32} height={32} className="w-8 h-8 object-contain" />
            </div>
            <p className="text-sm font-light text-gray-400">
              오늘은 <span className="text-gray-900">{formatDateKorean()}</span> 입니다
            </p>
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  );
}