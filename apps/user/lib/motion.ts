/**
 * 화면 요소 등장·단계 전환에 함께 쓰는 motion 값.
 * 곡선은 globals.css의 --ease-out-expo(cubic-bezier(0.16, 1, 0.3, 1))와 같다.
 */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** 카드·섹션이 처음 나타날 때 */
export const enterMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE_OUT_EXPO },
} as const;

/** 입력 단계가 바뀔 때. 나가는 쪽은 더 짧고 작게 움직인다 */
export const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeOut" } },
} as const;
