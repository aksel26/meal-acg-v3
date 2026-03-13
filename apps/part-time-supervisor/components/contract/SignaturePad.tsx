"use client";

import { useRef, useEffect, useCallback } from "react";
import SignaturePadLib from "signature_pad";

export default function SignaturePad({
  onSave,
  onClear,
  locked = false,
}: {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  locked?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
    };

    padRef.current = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!padRef.current) return;
    if (locked) {
      padRef.current.off();
    } else {
      padRef.current.on();
    }
  }, [locked]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    onClear?.();
  }, [onClear]);

  const handleSave = useCallback(() => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    onSave(padRef.current.toDataURL("image/png"));
  }, [onSave]);

  return (
    <div className="space-y-3">
      <div
        className={`overflow-hidden rounded-xl border-2 border-dashed ${
          locked ? "border-green-400" : "border-slate-300"
        }`}
      >
        <canvas
          ref={canvasRef}
          className={`h-48 w-full touch-none ${
            locked ? "pointer-events-none cursor-default" : "cursor-crosshair"
          }`}
        />
      </div>
      {!locked && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            지우기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            서명 확인
          </button>
        </div>
      )}
    </div>
  );
}
