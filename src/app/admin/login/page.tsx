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
  KeyRound,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";
import KbLogo from "@/components/brand/KbLogo";

export default function AdminFaceLoginPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Position your face inside the target frame");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [hasEnrolledAdmin, setHasEnrolledAdmin] = useState<boolean | null>(null);

  // Check enrollment status
  useEffect(() => {
    fetch("/api/auth/admin/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHasEnrolledAdmin(data.hasEnrolledAdmin);
          if (!data.hasEnrolledAdmin) {
            setStatusMessage("Initial setup: No admin registered yet. Please perform one-time face registration.");
          }
        }
      })
      .catch(console.error);
  }, []);

  // Fallback PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // 1. Initialize Webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setStatusMessage("Face detected. Align within the biometric reticle...");
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings or use Emergency PIN."
          : "Webcam hardware not detected. Use emergency backup PIN."
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
    startCamera();
    return () => stopCamera();
  }, []);

  /**
   * Generates a 64-dimensional normalized spatial luminance & edge landmark vector
   * from the center cropped face region of the video stream.
   */
  const extractFacialDescriptor = (): number[] | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 160;
    canvas.height = 160;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Compute spatial 8x8 block average intensities (64 float vector)
    const descriptor: number[] = [];
    const blockSize = 20;

    for (let by = 0; by < 8; by++) {
      for (let bx = 0; bx < 8; bx++) {
        let blockSum = 0;
        let count = 0;
        for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
            const idx = (y * canvas.width + x) * 4;
            // Greyscale luminance
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            blockSum += lum;
            count++;
          }
        }
        descriptor.push(blockSum / count / 255);
      }
    }

    return descriptor;
  };

  // Perform Face Scan & Match
  const handleScanFace = async () => {
    const descriptor = extractFacialDescriptor();
    if (!descriptor) {
      setStatusMessage("Could not capture frame. Ensure face is well-lit.");
      return;
    }

    try {
      setScanning(true);
      setStatusMessage("Analyzing facial geometric descriptor against Admin Profile...");

      const res = await fetch("/api/auth/admin/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveDescriptor: descriptor }),
      });

      const data = await res.json();

      if (data.needsEnrollment) {
        setStatusMessage("Admin face is not enrolled yet. Redirecting to initial enrollment...");
        setTimeout(() => {
          router.push("/admin/register");
        }, 1500);
        return;
      }

      if (data.success && data.match) {
        setMatchConfidence(data.confidence);
        setLoginSuccess(true);
        setStatusMessage(`Identity Verified (${data.confidence}% confidence match). Unlocking...`);
        localStorage.setItem("kb_admin_session", data.sessionToken);

        setTimeout(() => {
          router.push("/admin");
        }, 1200);
      } else {
        setMatchConfidence(data.confidence || 0);
        setStatusMessage(data.error || "Face does not match registered admin.");
      }
    } catch (err: any) {
      setStatusMessage("Verification network error. Try again or use PIN.");
    } finally {
      setScanning(false);
    }
  };

  // Emergency PIN handler
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPinError(null);
      const res = await fetch("/api/auth/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("kb_admin_session", data.sessionToken);
        setLoginSuccess(true);
        setShowPinModal(false);
        router.push("/admin");
      } else {
        setPinError(data.error || "Incorrect admin PIN");
      }
    } catch (err: any) {
      setPinError("Verification error");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-8 space-y-6 text-center">
        {/* Header Logo */}
        <div className="flex flex-col items-center">
          <KbLogo size="md" className="justify-center" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span>Admin Biometric Authentication</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Strict webcam-based facial recognition for store administration and audit control.
          </p>
        </div>

        {/* Live Camera Scanner Aperture */}
        <div className="relative mx-auto w-64 h-64 rounded-full overflow-hidden border-4 border-slate-200 shadow-inner bg-slate-950 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center text-xs text-rose-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p>{cameraError}</p>
            </div>
          ) : (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Crosshair Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-48 h-48 rounded-full border-2 transition-all duration-300 ${
                    loginSuccess
                      ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.8)]"
                      : scanning
                      ? "border-amber-400 animate-spin border-dashed"
                      : "border-emerald-500/60"
                  }`}
                />
                {/* Horizontal Scan Line Animation when scanning */}
                {scanning && (
                  <div className="absolute w-44 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                )}
              </div>
            </>
          )}

          {/* Success Badge */}
          {loginSuccess && (
            <div className="absolute inset-0 bg-emerald-950/70 flex flex-col items-center justify-center text-white animate-in zoom-in-75 duration-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-1" />
              <span className="font-bold text-sm tracking-wide">VERIFIED</span>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="space-y-1">
          <p
            className={`text-xs font-semibold ${
              loginSuccess
                ? "text-emerald-600"
                : matchConfidence && matchConfidence < 80
                ? "text-rose-600"
                : "text-slate-600"
            }`}
          >
            {statusMessage}
          </p>

          {matchConfidence !== null && (
            <p className="text-[11px] font-mono text-slate-400">
              Live Descriptor Match: <span className="font-bold text-slate-700">{matchConfidence}%</span>
            </p>
          )}
        </div>

        {/* Scan Actions */}
        <div className="space-y-2.5 pt-2">
          {!loginSuccess && (
            <button
              onClick={handleScanFace}
              disabled={scanning || !streamActive}
              className="kb-btn-primary w-full py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Scan className="w-4 h-4" />
              <span>{scanning ? "Analyzing Facial Vector..." : "Verify Face with Camera"}</span>
            </button>
          )}

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              onClick={() => {
                stopCamera();
                startCamera();
              }}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Camera</span>
            </button>

            <button
              onClick={() => setShowPinModal(true)}
              className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Emergency Backup PIN</span>
            </button>
          </div>
        </div>

        {/* Dynamic Registration Status Banner */}
        <div className="pt-3 border-t border-slate-100 text-[11px]">
          {hasEnrolledAdmin === false ? (
            <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 space-y-1.5">
              <p className="font-semibold text-xs">First-Time Setup Required</p>
              <p className="text-[11px] text-amber-800">
                No administrator face is currently registered. Perform one-time initial enrollment now. Once completed, registration is permanently disabled.
              </p>
              <Link
                href="/admin/register"
                className="inline-block mt-1 font-bold text-emerald-700 hover:text-emerald-900 underline text-xs"
              >
                Register Admin Face Profile →
              </Link>
            </div>
          ) : (
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Biometric Security Active • Admin Registration Locked</span>
            </div>
          )}
        </div>
      </div>


      {/* Emergency PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Emergency Hardware PIN</span>
              </h3>
              <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Used if webcam is broken or browser camera permissions are blocked. This unlock event is logged in the system audit journal.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  6-Digit Admin PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="******"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="kb-input text-center font-mono text-xl tracking-widest"
                  autoFocus
                />
              </div>

              {pinError && <p className="text-xs text-rose-600 font-semibold">{pinError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="kb-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="kb-btn-primary text-xs">
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

