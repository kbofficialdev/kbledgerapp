"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UserCheck,
  History,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  metadata?: any;
  createdAt: string;
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");

  const [activeTab, setActiveTab] = useState<"biometrics" | "audit">(
    initialAction === "enroll" ? "biometrics" : "biometrics"
  );

  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Webcam Enrollment State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollFeedback, setEnrollFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/admin/status");
      const data = await res.json();
      if (data.success) {
        setAdminStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.warn("Camera could not be started:", err);
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
    fetchStatus();
    startCamera();
    return () => stopCamera();
  }, []);

  const handleEnrollFace = async () => {
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

    // Generate 64-d luminance vector
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

    try {
      setEnrolling(true);
      setEnrollFeedback(null);
      const res = await fetch("/api/auth/admin/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "kbadmin",
          faceDescriptor: descriptor,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setEnrollFeedback({
          type: "success",
          message: "Facial biometric profile enrolled and saved into database!",
        });
        fetchStatus();
      } else {
        setEnrollFeedback({ type: "error", message: resData.error || "Enrollment failed" });
      }
    } catch (err: any) {
      setEnrollFeedback({ type: "error", message: err.message || "Network error" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("kb_admin_session");
    router.push("/admin/login");
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            <span>Admin Security &amp; Biometrics Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage webcam face recognition profiles, hardware PINs, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/login"
            className="kb-btn-secondary text-xs sm:text-sm py-2 px-3"
          >
            <Scan className="w-4 h-4 text-slate-600" />
            <span>Test Face Login</span>
          </Link>

          <button
            onClick={handleLogout}
            className="kb-btn-secondary text-xs sm:text-sm py-2 px-3 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Logout Session</span>
          </button>
        </div>
      </div>

      {enrollFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            enrollFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{enrollFeedback.message}</span>
          </div>
          <button onClick={() => setEnrollFeedback(null)} className="text-slate-400">
            ×
          </button>
        </div>
      )}

      {/* Admin Status Card */}
      <div className="kb-card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Account</p>
              <p className="text-base font-bold text-slate-900">{adminStatus?.adminUsername || "kbadmin"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Scan className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Biometric State</p>
              <p className="text-base font-bold font-mono text-emerald-600">
                {adminStatus?.hasEnrolledAdmin ? "Face Enrolled & Active" : "Not Enrolled"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <History className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last Verified Login</p>
              <p className="text-xs font-semibold text-slate-800">
                {adminStatus?.lastLoginAt ? formatDateTime(adminStatus.lastLoginAt) : "Initial session"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Enrollment Station */}
      <div className="kb-card-elevated p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-600" />
          <span>Webcam Face Enrollment Station</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Capture and register your baseline facial descriptor vector. Ensure proper lighting and look directly into the camera.
        </p>

        {adminStatus?.hasEnrolledAdmin ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Registration Permanently Locked</p>
              <p className="text-xs text-slate-500">
                Primary administrator face profile is active and securely locked. Subsequent public enrollments are strictly blocked by the authentication policy.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Live Video Preview Box */}
            <div className="relative w-56 h-56 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 flex items-center justify-center shadow-soft">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-2 border-emerald-400/70 border-dashed" />
              </div>
            </div>

            {/* Action & Instructions */}
            <div className="space-y-4 flex-1">
              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Initial Setup Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>Center face inside the circle aperture</li>
                  <li>Hold steady with neutral expression for 2 seconds</li>
                  <li>Click &quot;Capture &amp; Enroll Face&quot; to write vector to database</li>
                </ul>
              </div>

              <Link
                href="/admin/register"
                className="kb-btn-primary inline-flex"
              >
                <Scan className="w-4 h-4" />
                <span>Go to One-Time Registration Wizard →</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading admin center...</div>}>
      <AdminContent />
    </Suspense>
  );
}
