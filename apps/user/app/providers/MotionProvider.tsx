"use client";

import { MotionConfig } from "motion/react";

/**
 * 기기의 "동작 줄이기" 설정을 motion 애니메이션 전체에 적용한다.
 * 켜져 있으면 transform·layout 애니메이션은 꺼지고 opacity 같은 값만 바뀐다.
 * https://motion.dev/docs/react-accessibility
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
