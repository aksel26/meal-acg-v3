"use client";

import { cn } from "@repo/ui/lib/utils";
import { motion, useAnimation } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ScratchToRevealProps {
  children: React.ReactNode;
  width: number;
  height: number;
  minScratchPercentage?: number;
  className?: string;
  onComplete?: () => void;
  gradientColors?: [string, string, string];
}

const ScratchToReveal: React.FC<ScratchToRevealProps> = ({
  width,
  height,
  minScratchPercentage = 50,
  onComplete,
  children,
  className,
  gradientColors = ["#A97CF8", "#F38CB8", "#FDCC92"],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "#ccc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(0.5, gradientColors[1]);
      gradient.addColorStop(1, gradientColors[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("여기를 긁어주세요!", canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }
  }, [gradientColors]);

  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && !isComplete) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [isComplete],
  );

  const checkCompletion = useCallback(async () => {
    if (isComplete) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const totalPixels = pixels.length / 4;
      let clearPixels = 0;

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clearPixels++;
      }

      const percentage = (clearPixels / totalPixels) * 100;
      if (percentage >= minScratchPercentage) {
        setIsComplete(true);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await controls.start({
          scale: [1, 1.15, 0.95, 1.05, 1],
          rotate: [0, 4, -4, 2, 0],
          transition: { duration: 0.5 },
        });

        onComplete?.();
      }
    }
  }, [isComplete, minScratchPercentage, controls, onComplete]);

  const handleScratchBegin = useCallback(() => {
    if (isComplete) return;
    setIsScratching(true);
  }, [isComplete]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScratching) return;
      scratch(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isScratching) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) scratch(touch.clientX, touch.clientY);
    };
    const handleEnd = () => {
      if (isScratching) {
        setIsScratching(false);
        checkCompletion();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
    };
  }, [isScratching, scratch, checkCompletion]);

  return (
    <motion.div
      className={cn(
        "relative select-none overflow-hidden rounded-2xl",
        className,
      )}
      style={{ width, height, cursor: isComplete ? "default" : "grab" }}
      animate={controls}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          "absolute inset-0 z-10 rounded-2xl",
          isComplete && "pointer-events-none",
        )}
        onMouseDown={handleScratchBegin}
        onTouchStart={handleScratchBegin}
      />
    </motion.div>
  );
};

export default ScratchToReveal;
