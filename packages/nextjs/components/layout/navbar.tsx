import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "@starknet-react/core";
import { LogOut, Diamond, Hexagon, Menu } from "lucide-react";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

export function Navbar() {
  const pathname = usePathname();
  const { status } = useAccount();
  const { disconnect } = useDisconnect();
  const isConnected = status === "connected";

  const navLinks = [
    { name: "Savings", href: "/dashboard", badge: "4%" },
    { name: "Borrow", href: "/deposit" },
    { name: "BTSUSD", href: "#" },
    { name: "Swap", href: "#" },
  ];

  return (
    <>
      {/* Top Banner */}
      <div className="bg-[#6c48ff] text-white text-xs font-semibold py-2 px-4 flex justify-center items-center relative">
        <span>Save with WBTC and STRK in Bitcoin Standard Savings</span>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100">
          ×
        </button>
      </div>

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

            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] font-medium transition-all ${
                      isActive
                        ? "bg-black/5 text-black border border-black/10"
                        : "text-neutral-500 hover:text-black hover:bg-black/5"
                    }`}
                  >
                    {link.badge && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        }}
                      />
                    )}
                    {link.name}
                    {link.badge && (
                      <span className="text-green-600 font-bold ml-0.5">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#6c48ff] bg-[#6c48ff]/10 hover:bg-[#6c48ff]/20 transition-colors">
                <Hexagon className="w-3.5 h-3.5" /> Rewards
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#f43f5e] bg-[#f43f5e]/10 hover:bg-[#f43f5e]/20 transition-colors">
                <Diamond className="w-3.5 h-3.5" /> Points
              </button>
            </div>

            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center border border-black/10">
              <Image
                src="/bitcoin-btc-logo.svg"
                alt="Network"
                width={16}
                height={16}
                className="opacity-70"
              />
            </div>

            <div className="relative">
              <div className="opacity-0 absolute inset-0 z-10 pointer-events-auto">
                <CustomConnectButton />
              </div>
              <button
                className="flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-semibold text-white rounded-full transition-all hover:opacity-90 active:scale-95 shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                  pointerEvents: "none",
                }}
              >
                {isConnected ? "Connected" : "Connect Wallet"}
              </button>
            </div>

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
    </>
  );
}
