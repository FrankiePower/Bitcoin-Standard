"use client";

import Link from "next/link";
import { useAccount, useDisconnect } from "@starknet-react/core";
import { Button } from "~~/components/ui/button";
import { LogOut, Activity, Signal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { useState, useEffect } from "react";

export function Navbar() {
  const { address, status } = useAccount();
  const { disconnect } = useDisconnect();
  const isConnected = status === "connected";
  const [systemTime, setSystemTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setSystemTime(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Truncate address for display
  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <nav className="border-b border-neutral-800 bg-black/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 flex items-center justify-center">
                <span className="text-black font-bold text-sm">BTC</span>
              </div>
              <span className="text-sm font-bold tracking-wider text-white">
                BTC_STANDARD
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
              <Signal className="w-3 h-3 text-green-500" />
              <span>STARKNET_CONNECTED</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* System time */}
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <Activity className="w-3 h-3 text-orange-500 animate-pulse" />
              <span>{systemTime}</span>
            </div>

            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 px-3 bg-neutral-900 border-neutral-700 hover:bg-neutral-800 hover:border-orange-500/50 text-xs font-mono"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    {truncatedAddress}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-neutral-900 border-neutral-700" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs text-neutral-400">WALLET_ADDRESS</p>
                      <p className="text-xs text-orange-500 font-mono">
                        {truncatedAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-700" />
                  <DropdownMenuItem
                    onClick={() => disconnect()}
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>DISCONNECT</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <CustomConnectButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
