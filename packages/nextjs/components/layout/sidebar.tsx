"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~~/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  Bug,
  Search,
  History,
  ArrowDownToLine,
  Settings,
  Shield,
  Zap,
} from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const mainRoutes = [
    {
      label: "DASHBOARD",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "CREATE_VAULT",
      icon: PlusCircle,
      href: "/create-vault",
      active: pathname === "/create-vault",
    },
    {
      label: "DEPOSIT_BTC",
      icon: ArrowDownToLine,
      href: "/deposit",
      active: pathname === "/deposit",
    },
    {
      label: "TRANSACTIONS",
      icon: History,
      href: "/transactions",
      active: pathname === "/transactions",
    },
    {
      label: "YIELD_MATRIX",
      icon: TrendingUp,
      href: "/yield",
      active: pathname === "/yield",
    },
  ];

  const devRoutes = [
    {
      label: "DEBUG_CONTRACTS",
      icon: Bug,
      href: "/debug",
      active: pathname?.startsWith("/debug"),
    },
    {
      label: "BLOCK_EXPLORER",
      icon: Search,
      href: "/blockexplorer",
      active: pathname?.startsWith("/blockexplorer"),
    },
    {
      label: "SETTINGS",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
  ];

  return (
    <div
      className={cn(
        "w-56 border-r border-neutral-800 bg-black hidden md:flex flex-col",
        className,
      )}
    >
      {/* Protocol Status */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
          <Shield className="w-3 h-3 text-orange-500" />
          <span>PROTOCOL_STATUS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-500 font-mono">OPERATIONAL</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4">
        <div className="px-3 mb-2">
          <span className="text-[10px] text-neutral-600 tracking-wider">MAIN_OPERATIONS</span>
        </div>
        <div className="space-y-1 px-2">
          {mainRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-xs font-mono transition-all group",
                route.active
                  ? "bg-orange-500/10 text-orange-500 border-l-2 border-orange-500"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-l-2 border-transparent"
              )}
            >
              <route.icon className={cn(
                "w-4 h-4",
                route.active ? "text-orange-500" : "text-neutral-500 group-hover:text-white"
              )} />
              {route.label}
            </Link>
          ))}
        </div>

        {/* Dev Tools Section */}
        <div className="mt-6">
          <div className="px-3 mb-2">
            <span className="text-[10px] text-neutral-600 tracking-wider">DEV_TOOLS</span>
          </div>
          <div className="space-y-1 px-2">
            {devRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-mono transition-all group",
                  route.active
                    ? "bg-orange-500/10 text-orange-500 border-l-2 border-orange-500"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-l-2 border-transparent"
                )}
              >
                <route.icon className={cn(
                  "w-4 h-4",
                  route.active ? "text-orange-500" : "text-neutral-500 group-hover:text-white"
                )} />
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-[10px] text-neutral-600">
          <Zap className="w-3 h-3 text-orange-500" />
          <span>STARKNET_NETWORK</span>
        </div>
      </div>
    </div>
  );
}
