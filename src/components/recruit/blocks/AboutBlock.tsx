import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

export default function AboutBlock() {
  return (
    <section id="about" className="py-24 md:py-48 px-6 bg-[#eadecf] relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <Image src="/images/recruit/interior_03.jpg" alt="interior deco" fill className="object-cover" />
      </div>
      
      <div className="max-w-4xl mx-auto md:grid md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-24 items-center relative z-10">
        <ScrollReveal animation="fade-up" className="w-full">
          <div className="flex items-center justify-between md:block mb-8 md:mb-0">
            <div className="relative text-left">
              <div className="absolute -top-6 -left-4 md:-left-6 w-40 h-16 md:w-56 md:h-24 opacity-[0.04] pointer-events-none mix-blend-multiply">
                <Image src="/images/recruit/logo.jpg" alt="" fill className="object-contain" />
              </div>
              <div className="relative z-10 flex items-center gap-3 mb-4 justify-start">
                <div className="w-8 h-[1px] bg-[#a48a71]/40" />
                <p className="text-[#a48a71] text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-semibold">ABOUT US</p>
                <div className="w-8 h-[1px] bg-[#a48a71]/40" />
              </div>
              <div className="relative z-10 inline-block px-8 md:px-12">
                <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30" viewBox="0 0 40 20">
                  <path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <h2 className="text-xl md:text-3xl font-medium tracking-[0.15em] text-[#2c221a] font-shippori relative z-10">enuについて</h2>
                <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30 rotate-180" viewBox="0 0 40 20">
                  <path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
            </div>
            <div className="block md:hidden w-[120px] sm:w-[160px] shrink-0 relative ml-4">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md animate-powa">
                <Image src="/images/recruit/interior_02.jpg" alt="enu nailsalon サロン内装" fill className="object-cover" sizes="120px" />
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 text-[#2c221a] text-[13px] md:text-base leading-[2.2] md:leading-[2.5] font-medium mt-6 md:mt-12">
            <p><W>enuは、</W><W>「通いやすい価格で、</W><W>毎日ちょっと気分が上がる</W><W>ネイルを楽しめる」</W><W>そんな想いから生まれた</W><W>ニュアンスネイルサロンです。</W></p>
            <p><span className="font-semibold border-b border-[#a48a71] inline-block">girly nuance × mood design</span> <W>を軸に、</W><W>ちゅるん系・淡色ニュアンス・</W><W>抜け感デザインなど、</W><W>&ldquo;女性らしい雰囲気&rdquo;を</W><W>大切にしたデザインを</W><W>ご提案しています。</W></p>
            <p><W>ただ可愛いだけではなく、</W><W>フィルイン対応・持ちの良さ・</W><W>爪への負担を考えた施術など、</W><W>基礎となる技術面も</W><W>妥協せず追求しているサロンです。</W></p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" className="hidden md:block w-full relative">
          <div className="absolute -inset-4 border border-[#8e735b]/30 rounded-[2.5rem] translate-x-3 translate-y-3 pointer-events-none" />
          <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl animate-powa">
            <Image src="/images/recruit/interior_02.jpg" alt="enu nailsalon サロン内装" fill className="object-cover" sizes="50vw" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}