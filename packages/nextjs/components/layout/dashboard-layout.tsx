"use client";

import type React from "react";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tactical loading screen
  const LoadingScreen = () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-neutral-800 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
        <div className="text-xs text-neutral-500 font-mono tracking-wider">
          INITIALIZING_PROTOCOL...
        </div>
      </div>
    </div>
  );

  // Show loading while mounting (to prevent hydration mismatch)
  if (!mounted) {
    return <LoadingScreen />;
  }

  // Redirect to landing if not connected
  if (status === "disconnected") {
    router.push("/");
    return <LoadingScreen />;
  }

  // Show loading while connecting
  if (status === "connecting" || status === "reconnecting") {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-neutral-950">
          {/* Grid background pattern */}
          <div
            className="fixed inset-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
