import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

type Step = {
  num: string;
  phase: string;
  title: string;
  body: string;
};

type Props = {
  steps: Step[];
  renderWrapped: (text: string) => React.ReactNode;
};

export default function StepsBlock({ steps, renderWrapped }: Props) {
  return (
    <section id="steps" className="py-24 md:py-48 px-6 bg-[#dfd2c1] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <Image src="/images/recruit/interior_04.jpg" alt="interior deco" fill className="object-cover" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <SectionHeading en="STEPS" ja="入客までのステップ" center />
        <ScrollReveal animation="fade-up">
          <p className="text-center text-[#8e735b] text-[15px] md:text-lg font-bold tracking-widest -mt-6 mb-12 drop-shadow-sm">〈 デビュー目安：1ヶ月半～3ヶ月 〉</p>
          
          <div className="relative group/slider">
            <div id="step-slider" className="flex overflow-x-auto pb-6 pt-4 gap-6 md:gap-8 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-x-visible md:pb-0 relative" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
              {steps.map((step, i) => (
                <div key={step.num} className="min-w-[280px] md:min-w-0 snap-center relative bg-white/45 backdrop-blur-md border border-white/60 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col items-center text-center transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group">
                  <div className="flex flex-col items-center gap-2 mb-4 md:mb-5 w-full">
                    <span className="text-[10px] md:text-xs font-bold text-[#8e735b] tracking-widest border border-[#8e735b]/30 px-3 py-1 rounded-full bg-white/70">Phase {step.num}</span>
                    <span className="text-[11px] md:text-xs font-bold text-[#8e735b]/80 tracking-[0.1em]">{step.phase}</span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-[#2c221a] mb-4 md:mb-5 tracking-wide leading-snug font-shippori">{step.title}</h3>
                  <p className="text-[#2c221a]/90 text-[12.5px] md:text-sm leading-[2.2] font-medium flex-1">{renderWrapped(step.body)}</p>
                  {i < steps.length - 1 && (
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#8e735b]/30 text-[#8e735b] shadow-sm opacity-90 md:-right-4.5 transition-all group-hover:scale-110">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 右スワイプ用矢印ボタン */}
            <div dangerouslySetInnerHTML={{ __html: `
              <button 
                type="button"
                class="md:hidden absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/90 backdrop-blur-sm border border-[#8e735b]/30 rounded-full shadow-lg flex items-center justify-center text-[#8e735b] hover:bg-white transition-colors"
                onclick="document.getElementById('step-slider').scrollBy({ left: 320, behavior: 'smooth' })"
                aria-label="次のステップへ"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            `}} />
          </div>

          <div className="mt-12 md:mt-20 bg-white/40 backdrop-blur-sm rounded-[2rem] p-6 md:p-10 max-w-3xl mx-auto border border-white/60 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#8e735b]/5 rounded-bl-full pointer-events-none" />
            <p className="text-[#2c221a] text-[15px] md:text-[1.2rem] font-bold tracking-[0.05em] mb-4 relative z-10 border-b border-[#8e735b]/20 inline-block pb-2">技術面の不安はすぐに解消！</p>
            <p className="text-[#8e735b] text-[13px] md:text-[0.95rem] font-semibold tracking-wide leading-[2.2] relative z-10">
              <W>自信を持って働けるように、</W><W>繁忙期を除く月に1回、</W><W>技術レッスンがあります。</W><br className="hidden md:block"/><W>一人ひとりに合った練習法も、</W><W>オーナーが直々に指導します。</W>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}