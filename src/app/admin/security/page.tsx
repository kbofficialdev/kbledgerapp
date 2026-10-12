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
  Lock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";

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

  const [adminStatus, setAdminStatus] = useState<any>(null);
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
      if (!data.isAuthenticated) {
        localStorage.removeItem("kb_admin_session");
        window.location.replace("/admin/login");
        return;
      }
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
    if (enrolling) return;
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
    localStorage.removeItem("kb_admin_session");
    sessionStorage.clear();
    window.location.replace("/admin/login");
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <PageHeader
        title="Admin Security & Biometrics"
        description="Webcam face recognition profiles, hardware PINs, and security audit logs."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/login">
              <Button variant="outline" size="sm" icon={Scan}>
                Test Face Login
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              icon={LogOut}
              onClick={handleLogout}
            >
              Logout Session
            </Button>
          </div>
        }
      />

      {enrollFeedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-medium ${
            enrollFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {enrollFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{enrollFeedback.message}</span>
          </div>
          <button onClick={() => setEnrollFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Admin Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Admin Account"
          value={adminStatus?.adminUsername || "kbadmin"}
          icon={UserCheck}
          variant="slate"
          description="Authorized primary system operator"
        />
        <MetricCard
          label="Biometric State"
          value={adminStatus?.hasEnrolledAdmin ? "Enrolled & Active" : "Not Enrolled"}
          icon={Scan}
          variant={adminStatus?.hasEnrolledAdmin ? "emerald" : "amber"}
          description="Facial vector authentication status"
        />
        <MetricCard
          label="Last Verified Login"
          value={adminStatus?.lastLoginAt ? formatDateTime(adminStatus.lastLoginAt) : "Initial session"}
          icon={History}
          variant="indigo"
          description="Session authentication timestamp"
        />
      </div>

      {/* Biometric Enrollment Station */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Webcam Face Enrollment Station</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Capture and register your baseline facial descriptor vector. Ensure proper lighting and look directly into the camera.
          </p>
        </div>

        {adminStatus?.hasEnrolledAdmin ? (
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-lg flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Registration Permanently Locked</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Primary administrator face profile is active and securely locked. Subsequent public enrollments are strictly blocked by the authentication policy.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
            {/* Live Video Preview Box */}
            <div className="relative w-52 h-52 rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 bg-slate-950 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-2 border-emerald-400/70 border-dashed" />
              </div>
            </div>

            {/* Action & Instructions */}
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                <p className="font-semibold text-slate-800 dark:text-zinc-200">Initial Setup Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-zinc-400">
                  <li>Center face inside the circle aperture</li>
                  <li>Hold steady with neutral expression for 2 seconds</li>
                  <li>Click below to proceed to the registration wizard</li>
                </ul>
              </div>

              <Link href="/admin/register" className="inline-block">
                <Button variant="primary" size="md" icon={Scan}>
                  Go to One-Time Registration Wizard →
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
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
