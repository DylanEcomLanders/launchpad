"use client";

import { useRef, useEffect, useCallback } from "react";

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}

export function SignaturePad({
  value,
  onChange,
  label = "Your Signature",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  /* Initialise canvas with white background */
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Drawing style
    ctx.strokeStyle = "#1B1B1B";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  /* Redraw from saved data URL when value is cleared externally */
  useEffect(() => {
    if (!value && hasDrawnRef.current) {
      initCanvas();
      hasDrawnRef.current = false;
    }
  }, [value, initCanvas]);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    if (!pos) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const handleClear = () => {
    initCanvas();
    hasDrawnRef.current = false;
    onChange("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          {label}
        </label>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full border border-[#E5E5EA] rounded-md cursor-crosshair bg-white"
        style={{ height: 150, touchAction: "none" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      {!value && (
        <p className="mt-1.5 text-[10px] text-[#A0A0A0]">
          Draw your signature above
        </p>
      )}
    </div>
  );
}
