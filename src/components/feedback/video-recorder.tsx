"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VideoCameraIcon,
  StopIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type Status = "idle" | "ready" | "recording" | "recorded";

const MAX_SECONDS = 180; // soft cap; auto-stops a runaway recording

/* Pick a container/codec the browser actually supports. */
function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoRecorder({
  onChange,
}: {
  onChange: (blob: Blob | null) => void;
}) {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window === "undefined" ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setSupported(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      clearTimer();
      revokeUrl();
    };
  }, [stopStream, clearTimer, revokeUrl]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.muted = true;
        v.controls = false;
        await v.play().catch(() => {});
      }
      setStatus("ready");
    } catch {
      setError(
        "Couldn't access your camera. Please allow camera and microphone access, then try again.",
      );
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      revokeUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      stopStream();
      const v = videoRef.current;
      if (v) {
        v.srcObject = null;
        v.src = url;
        v.muted = false;
        v.controls = true;
      }
      setStatus("recorded");
      onChange(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setStatus("recording");
    clearTimer();
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) stopRecording();
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    clearTimer();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function reset() {
    clearTimer();
    stopStream();
    revokeUrl();
    chunksRef.current = [];
    setElapsed(0);
    setError(null);
    setStatus("idle");
    onChange(null);
    const v = videoRef.current;
    if (v) {
      v.src = "";
      v.srcObject = null;
      v.controls = false;
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-subtle">
        Video recording isn&apos;t supported in this browser. Try Chrome, Edge or
        Safari, or just skip the video.
      </p>
    );
  }

  const mirror = status === "ready" || status === "recording";

  return (
    <div>
      {/* Video surface, always mounted so the ref exists; hidden until live */}
      <div
        className={`relative rounded-lg overflow-hidden bg-black mb-3 aspect-video ${status === "idle" ? "hidden" : ""}`}
      >
        <video
          ref={videoRef}
          playsInline
          className={`w-full h-full object-cover ${mirror ? "-scale-x-100" : ""}`}
        />
        {status === "recording" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            {fmt(elapsed)}
          </div>
        )}
      </div>

      {/* Controls */}
      {status === "idle" && (
        <button
          type="button"
          onClick={startCamera}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-surface-raised transition-colors"
        >
          <VideoCameraIcon className="size-4" />
          Record a video
        </button>
      )}

      {status === "ready" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white text-background rounded-lg hover:bg-foreground transition-colors"
          >
            <span className="size-2.5 rounded-full bg-red-500" />
            Start recording
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-subtle hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {status === "recording" && (
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white text-background rounded-lg hover:bg-foreground transition-colors"
        >
          <StopIcon className="size-4" />
          Stop recording
        </button>
      )}

      {status === "recorded" && (
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-success">
            Video ready to send
          </span>
          <button
            type="button"
            onClick={() => {
              reset();
              startCamera();
            }}
            className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
          >
            <ArrowPathIcon className="size-4" />
            Re-record
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-red-500 transition-colors"
          >
            <TrashIcon className="size-4" />
            Remove
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
