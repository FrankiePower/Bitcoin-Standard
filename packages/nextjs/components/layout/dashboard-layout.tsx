"use client";

import type React from "react";
import { Navbar } from "./navbar";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
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

  // Simple loading screen
  const LoadingScreen = () => (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-neutral-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
      </div>
    </div>
  );

  // Show loading while mounting
  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col text-black font-sans">
      <Navbar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle background SVG lines similar to Spark */}
        <div className="absolute top-0 right-0 w-[50vw] h-[80vh] pointer-events-none overflow-hidden opacity-30">
          <svg
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-[-10%] top-[-10%] w-[120%] h-[120%]"
          >
            <path
              d="M 500 0 Q 300 250 0 500"
              stroke="#000"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M 500 50 Q 320 280 0 600"
              stroke="#000"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M 500 100 Q 340 310 0 700"
              stroke="#000"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M 450 -50 Q 250 200 -50 450"
              stroke="#000"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M 400 -100 Q 200 150 -100 400"
              stroke="#000"
              strokeWidth="0.5"
              fill="none"
            />
          </svg>
        </div>
        <div className="relative z-10 p-6 md:p-8 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
