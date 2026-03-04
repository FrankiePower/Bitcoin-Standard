import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "@starknet-react/core";
import {
  LogOut,
  Menu,
  Droplets,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { FaucetModal } from "~~/components/FaucetModal";

export function Navbar() {
  const pathname = usePathname();
  const { status } = useAccount();
  const { disconnect } = useDisconnect();
  const isConnected = status === "connected";
  const [faucetOpen, setFaucetOpen] = useState(false);

  const navLinks = [
    { name: "BTSUSD", href: "/dashboard" },
    { name: "Borrow", href: "/borrow" },
    { name: "Savings", href: "/btsusd", badge: "4%" },
  ];

  return (
    <>
      {/* Main Navbar */}
      <nav className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-[68px] flex justify-between items-center">
          {/* Left Section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 mr-2">
              <Image
                src="/bitcoin-btc-logo.svg"
                alt="Bitcoin Standard"
                width={32}
                height={32}
              />
            </Link>

            <div className="hidden md:flex items-center gap-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;

                // Specialized styling for Savings
                if (link.name === "Savings") {
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] text-[14px] font-bold transition-all border ${
                        isActive
                          ? "bg-white border-emerald-500/30 shadow-sm text-emerald-600"
                          : "bg-neutral-50/50 border-transparent text-neutral-500 hover:text-black hover:bg-white hover:border-neutral-200"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      </div>
                      {link.name}
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                        {link.badge}
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[14px] font-bold transition-all border ${
                      isActive
                        ? "bg-white border-orange-500/30 shadow-sm text-orange-600"
                        : "text-neutral-500 hover:text-black hover:bg-white hover:border-neutral-200 border-transparent"
                    }`}
                  >
                    {link.name === "Borrow" && (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {link.name === "BTSUSD" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Faucet Button */}
            <button
              onClick={() => setFaucetOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
              title="Get test tokens"
            >
              <Droplets className="w-4 h-4" />
              <span className="hidden sm:inline">Faucet</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center border border-black/10">
              <Image
                src="/bitcoin-btc-logo.svg"
                alt="Network"
                width={16}
                height={16}
                className="opacity-70"
              />
            </div>

            <CustomConnectButton />

            {isConnected && (
              <button
                onClick={() => disconnect()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-black hover:bg-black/5 transition-all"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button className="md:hidden w-10 h-10 rounded-full flex items-center justify-center border border-black/10 bg-white">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Faucet Modal */}
      <FaucetModal isOpen={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </>
  );
}
