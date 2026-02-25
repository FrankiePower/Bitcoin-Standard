"use client"


import { ArrowRight, Bot, Shield, Zap, QrCode, Globe, CreditCard, Fingerprint, TrendingUp, Receipt, Bitcoin } from "lucide-react"
import { Navbar } from "~~/components/layout/navbar"
import { Button } from "~~/components/ui/button"
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[30%] rounded-full bg-violet-500/10 blur-[120px]" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-24 pb-32 md:pt-36 md:pb-40 px-4 text-center">
          <div className="max-w-5xl mx-auto space-y-8 relative z-10">
            <div className="mx-auto inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
              Bitcoin-Backed Stablecoins on Starknet
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              The Bitcoin <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-primary to-violet-500">
                Standard Protocol
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Deposit Bitcoin, mint BTSUSD stablecoins, and earn yield.
              A decentralized CDP protocol bringing Bitcoin&apos;s security to Starknet&apos;s scalability.
            </p>

            <div className="pt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <CustomConnectButton />
              <Button size="lg" variant="outline" className="text-lg h-14 px-10 rounded-full bg-background/50 backdrop-blur-sm border-muted-foreground/20 hover:bg-muted transition-all">
                Read Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30 border-y border-border/50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Everything you need to leverage Bitcoin</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Bitcoin Standard combines Bitcoin collateral, algorithmic stablecoins, and DeFi yield into one seamless protocol.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all">
                  <Bitcoin className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Bitcoin Collateral</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Deposit wrapped Bitcoin (WBTC) as collateral to mint BTSUSD stablecoins. Your Bitcoin stays secure while you access liquidity.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                  <Globe className="h-7 w-7 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Starknet Scalability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Built on Starknet L2 for lightning-fast transactions and minimal gas fees. Enjoy the security of Ethereum with the speed you need.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-violet-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 group-hover:scale-110 transition-all">
                  <Shield className="h-7 w-7 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Over-Collateralized CDPs</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Safe collateralized debt positions with configurable health factors. Automated liquidations protect the protocol and your assets.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
                  <CreditCard className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">BTSUSD Stablecoin</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Mint BTSUSD - a Bitcoin-backed stablecoin pegged to the US Dollar. Use it across DeFi or hold for stability.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
                  <TrendingUp className="h-7 w-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Yield Strategies</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Earn yield on your BTSUSD through integrated DeFi strategies. Automated yield optimization maximizes your returns.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-rose-500/50 transition-all group">
                <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:bg-rose-500/20 group-hover:scale-110 transition-all">
                  <Bot className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Automated Risk Management</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Smart risk engine monitors your positions 24/7. Get alerts before liquidation and auto-repay options to protect your collateral.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 px-4 bg-background relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">How it works</h2>
              <p className="text-lg text-muted-foreground">From connecting your wallet to minting stablecoins in minutes.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 md:gap-4 relative">
              {/* Connector line (Desktop only) */}
              <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-[2px] bg-border z-0" />

              {[
                { step: "01", title: "Connect Wallet", desc: "Connect your Starknet wallet (Braavos or ArgentX) to access the protocol." },
                { step: "02", title: "Deposit Bitcoin", desc: "Deposit wrapped Bitcoin as collateral into your vault position." },
                { step: "03", title: "Mint BTSUSD", desc: "Mint BTSUSD stablecoins against your Bitcoin collateral at your chosen ratio." },
                { step: "04", title: "Earn Yield", desc: "Deploy your BTSUSD into yield strategies or use it across DeFi." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-5 px-2">
                  <div className="w-24 h-24 rounded-full bg-background border-4 border-muted flex items-center justify-center shadow-lg group hover:border-primary/50 transition-all">
                    <span className="text-3xl font-extrabold text-muted-foreground/30 group-hover:text-primary transition-colors">{item.step}</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10"></div>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Ready to unlock <br className="hidden md:block" /> your Bitcoin?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the future of Bitcoin-backed DeFi. Mint stablecoins, earn yield, and maintain exposure to Bitcoin.
            </p>
            <CustomConnectButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-muted-foreground">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Bitcoin className="h-4 w-4 text-orange-500" />
            </div>
            <span className="font-bold text-foreground text-xl tracking-tight">Bitcoin Standard</span>
          </div>

          <p className="text-sm">© 2026 Bitcoin Standard. All rights reserved.</p>

          <div className="flex space-x-6 mt-6 md:mt-0 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
