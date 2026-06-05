import React from "react";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

// 強みデータの型定義
type StrengthCard = {
  num: string;
  title: string;
  body: string;
};

type Props = {
  cards: StrengthCard[];
  renderWrapped: (text: string) => React.ReactNode;
};

export default function StrengthsBlock({ cards, renderWrapped }: Props) {
  return (
    <section id="strengths" className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
      <div className="max-w-4xl mx-auto">
        <SectionHeading en="STRENGTHS" ja="enuで働く4つの強み" center />

        <div className="grid md:grid-cols-2 gap-x-16 gap-y-16">
          {cards.map((card) => (
            <ScrollReveal key={card.num} animation="fade-up" className="relative group text-center flex flex-col items-center w-full">
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 text-7xl md:text-8xl font-black text-[#8e735b]/3 pointer-events-none italic tracking-tighter select-none">{card.num}</div>
              <div className="absolute left-1/2 -translate-x-1/2 -top-4 text-3xl md:text-4xl font-bold text-[#8e735b]/20 tracking-tighter italic">{card.num}</div>
              <h3 className="text-base md:text-xl font-semibold mb-4 md:mb-5 text-[#2c221a] tracking-wider flex items-center justify-center gap-3 mt-4 w-full">
                <span className="w-4 md:w-6 h-[1px] bg-[#8e735b]" />
                <span className="flex-1 flex flex-wrap justify-center gap-x-0.5">
                  {card.title.split('|').map((seg, i) => <span key={i} className="inline-block">{seg}</span>)}
                </span>
                <span className="w-4 md:w-6 h-[1px] bg-[#8e735b]" />
              </h3>
              <p className="text-[#2c221a]/90 text-[13px] md:text-[0.95rem] leading-[2.2] md:leading-[2.4] font-medium text-center max-w-sm mx-auto">
                {renderWrapped(card.body)}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}