import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";

// 簡易的なヘルパーコンポーネント
const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

export default function HeroBlock() {
  return (
    <section id="top" className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-32 md:pb-24">
      <style>{`
        @keyframes powa {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.03); filter: brightness(1.05); }
        }
        .animate-powa { animation: powa 8s ease-in-out infinite; }
      `}</style>
      
      <div className="absolute inset-0 animate-powa">
        <Image src="/images/recruit/interior_01.jpg" alt="enu nailsalon 内装" fill priority className="object-cover scale-110 filter blur-[0.5px] brightness-[0.7]" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#2c221a]/60 via-[#2c221a]/40 to-[#eadecf]" />

      <ScrollReveal animation="fade-up" className="relative z-10 text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center w-full">
        <p className="block text-[10px] md:text-[11px] tracking-[0.6em] text-white/80 uppercase mb-5 font-semibold drop-shadow-sm">enu nailsalon recruitment</p>
        <h1 className="text-2xl md:text-[3rem] font-semibold text-white tracking-[0.2em] leading-[2.1] mb-10 font-shippori drop-shadow-[0_4px_20px_rgba(27,20,15,0.9)]">
          <W>自信を持って働ける</W><br className="md:hidden" />
          <W>ネイリストを育てたい</W>
        </h1>
        <div className="w-16 md:w-20 h-[1px] bg-[#c4ab93] mx-auto mb-10 opacity-70" />
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 text-white/95 text-xs md:text-base tracking-[0.3em] mb-12 font-medium drop-shadow-md">
          <W>girly nuance × mood design</W><span className="hidden md:block w-1 h-1 bg-[#c4ab93] rounded-full" /><W>本川越駅徒歩0分</W>
        </div>
        <p className="text-white text-[14px] md:text-[1.2rem] leading-[2.6] md:leading-[2.8] max-w-2xl mx-auto font-medium drop-shadow-[0_2px_10px_rgba(27,20,15,0.7)]">
          <W>enuでは、未経験の方でも</W><W>頑張る気持ちを</W><W>全力でサポートします。</W>
        </p>
      </ScrollReveal>
    </section>
  );
}