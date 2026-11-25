// react-bits ClickSpark JS 버전(ClickSpark.jsx)의 타입 선언. props 정의는 react-bits TS 버전에서 그대로 옮겼다.
import type { CSSProperties, ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";

export type ClickSparkShape = 'line' | 'streak' | 'dot' | 'star';

export type ClickSparkEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';

export interface ClickSparkProps {
  sparkColor?: string | string[];
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  sparkWidth?: number;
  duration?: number;
  easing?: ClickSparkEasing;
  extraScale?: number;
  shape?: ClickSparkShape;
  randomness?: number;
  gravity?: number;
  spread?: number;
  direction?: number;
  glow?: number;
  ring?: boolean;
  layer?: 'front' | 'back';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface ClickSparkHandle {
  spark: (x?: number, y?: number) => void;
}

declare const ClickSpark: ForwardRefExoticComponent<ClickSparkProps & RefAttributes<ClickSparkHandle>>;
export default ClickSpark;
