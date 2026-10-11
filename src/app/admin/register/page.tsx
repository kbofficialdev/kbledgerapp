"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import KbLogo from "@/components/brand/KbLogo";

export default function AdminRegisterPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(true);

  // Form State
  const [username, setUsername] = useState("kbadmin");
  const [fallbackPin, setFallbackPin] = useState("123456");
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedVector, setCapturedVector] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Check if admin already exists
  useEffect(() => {
    fetch("/api/auth/admin/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsRegistrationAllowed(data.isRegistrationAllowed);
        }
      })
      .catch(console.error)
      .finally(() => setCheckingStatus(false));
  }, []);

  // 2. Start Camera if registration is allowed
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Webcam hardware not detected. Check camera connection."
      );
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    if (isRegistrationAllowed) {
      startCamera();
    }
    return () => stopCamera();
  }, [isRegistrationAllowed]);

  // Extract Facial Descriptor Vector
  const captureFaceVector = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 160;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const descriptor: number[] = [];
    const blockSize = 20;

    for (let by = 0; by < 8; by++) {
      for (let bx = 0; bx < 8; bx++) {
        let blockSum = 0;
        let count = 0;
        for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
            const idx = (y * canvas.width + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            blockSum += lum;
            count++;
          }
        }
        descriptor.push(blockSum / count / 255);
      }
    }

    setCapturedVector(descriptor);
    setFeedback({
      type: "success",
      message: "Face geometry captured! Click 'Complete Initial Registration' to lock.",
    });
  };

  // Submit Initial Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedVector) {
      setFeedback({ type: "error", message: "Please capture your face using the webcam first." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/auth/admin/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          faceDescriptor: capturedVector,
          fallbackPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: "Registration complete! Admin face locked. Registration is now permanently disabled.",
        });
        localStorage.setItem("kb_admin_session", data.sessionToken);

        setTimeout(() => {
          router.push("/admin");
        }, 1500);
      } else {
        setFeedback({ type: "error", message: data.error || "Registration failed" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs font-mono text-slate-400">
        Verifying security status...
      </div>
    );
  }

  // If already registered: Show registration disabled screen
  if (!isRegistrationAllowed) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto border border-slate-200">
            <Lock className="w-8 h-8 text-slate-800" />
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Admin Registration is Disabled
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              The Administrator face profile has already been registered and locked. For security reasons, registration is permanently closed.
            </p>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
            Please authenticate using webcam face recognition.
          </div>

          <Link
            href="/admin/login"
            className="kb-btn-primary w-full py-3 text-sm font-bold justify-center"
          >
            <span>Proceed to Admin Face Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Initial One-Time Registration Screen
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <KbLogo size="md" className="justify-center" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-4 flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <span>One-Time Initial Admin Face Setup</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Perform initial biometric registration. Once saved, <strong>registration is permanently locked</strong> and all future access requires webcam face recognition.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400">
              ×
            </button>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        <div className="space-y-2 text-center">
          <div className="relative mx-auto w-56 h-56 rounded-full overflow-hidden border-4 border-emerald-200 bg-slate-950 flex items-center justify-center shadow-inner">
            {cameraError ? (
              <div className="p-4 text-center text-xs text-rose-400">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-1" />
                <p>{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-44 h-44 rounded-full border-2 transition-all ${
                      capturedVector
                        ? "border-emerald-500 shadow-[0_0_20px_#10b981]"
                        : "border-emerald-400/60 border-dashed animate-pulse"
                    }`}
                  />
                </div>
              </>
            )}

            {capturedVector && (
              <div className="absolute inset-0 bg-emerald-950/70 flex flex-col items-center justify-center text-white animate-in zoom-in-75">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
                <span className="font-bold text-xs">FACE VECTOR CAPTURED</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {!capturedVector ? (
              <button
                type="button"
                onClick={captureFaceVector}
                disabled={!streamActive}
                className="kb-btn-primary text-xs py-2 px-4 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture &amp; Extract Face</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCapturedVector(null)}
                className="kb-btn-secondary text-xs py-1.5 px-3"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-take Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmitRegistration} className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="kb-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Emergency Backup PIN (6 digits)
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={fallbackPin}
              onChange={(e) => setFallbackPin(e.target.value)}
              className="kb-input font-mono tracking-widest text-center"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used strictly in hardware emergencies if the webcam fails.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !capturedVector}
            className="kb-btn-primary w-full py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? "Locking & Registering..." : "Complete Initial Registration & Lock"}
          </button>
        </form>
      </div>
    </div>
  );
}

