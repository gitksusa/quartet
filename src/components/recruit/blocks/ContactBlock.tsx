import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

export default function ContactBlock() {
  return (
    <section id="contact" className="py-24 md:py-36 px-6 bg-[#eadecf] text-center relative">
      <div className="max-w-3xl mx-auto">
        <SectionHeading en="CONTACT" ja="お問い合わせ・ご応募" center />
        <ScrollReveal animation="fade-up">
          <p className="text-[#2c221a] text-sm md:text-base leading-[2.2] mb-10 max-w-xl mx-auto font-medium"><W>求人のご応募は、</W><W>公式LINEより</W><W>お気軽にご連絡ください。</W></p>
          <a href="https://lin.ee/Q8fwNYD" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-[#06C755] text-white font-bold text-sm md:text-base px-12 py-5 rounded-full shadow-lg hover:scale-105 transition-transform duration-300 group max-w-sm w-full mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 transform group-hover:rotate-12 transition-transform">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEから応募・相談する
          </a>
          <p className="mt-6 md:mt-8 text-[11px] md:text-xs text-[#2c221a]/50 tracking-[0.2em] font-medium">LINE ID：@169wzdvp</p>
          <div className="mt-24 md:mt-32 pt-12 md:pt-16 border-t border-[#8e735b]/20 flex flex-col items-center">
            <a href="https://qrtt.jp/enu" className="group block relative w-32 md:w-40 h-16 md:h-20 transition-transform duration-500 hover:scale-105"><Image src="/images/recruit/logo.jpg" alt="enu logo" fill className="object-contain" /></a>
            <a href="https://qrtt.jp/enu" className="text-[10px] md:text-[11px] text-[#8e735b] tracking-[0.2em] border-b border-[#8e735b]/40 pb-1 hover:opacity-60 transition-opacity duration-300 font-semibold mt-4">enu Official Website</a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}