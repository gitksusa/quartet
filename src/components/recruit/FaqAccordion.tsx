"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "未経験でも大丈夫ですか？",
    answer: '大丈夫です。|enuでは、|"未経験から育てる"ことを|前提にしています。\n\n技術マニュアルや|チェック制度も整えながら、|段階的にデビューを目指します。',
  },
  {
    question: "デビューまでどれくらいですか？",
    answer: "平均1ヶ月半〜3ヶ月ほどで|デビューを目指します。\n\n技術チェックを段階的に行い、|基準をクリアしてから|入客となるため、|未経験の方でも|安心して成長できます。",
  },
  {
    question: "技術に自信がなくても大丈夫ですか？",
    answer: "大丈夫です。|完璧な技術を|求めているわけではありません。\n\n不安なことや迷うことがあれば、|相談しながら進めていける方を|歓迎しています。",
  },
  {
    question: "ノルマはありますか？",
    answer: "個人ノルマというより、|チームで成長していくことを|大切にしています。",
  },
  {
    question: "サロンの雰囲気はどんな感じですか？",
    answer: "少人数で、|落ち着いた雰囲気のサロンです。\n\n現在はオーナー1人で運営しており、|これから一緒にサロンを|つくっていく段階です。\n\nお客様ともスタッフとも、|穏やかに向き合える環境を|大切にしています。",
  },
  {
    question: "モデル集めは必要ですか？",
    answer: "基本的なモデル募集は|サロン側で行います。\n\n練習段階や技術レベルに合わせて、|サロンが責任をもって|モデルさんを手配します。\n\nご本人のご家族やご友人に|お願いできる場合は歓迎ですが、|必須ではありません。",
  },
];

function renderFaqAnswer(text: string) {
  return text.split('\n\n').map((para, pi) => (
    <span key={pi} className={pi > 0 ? "block mt-3" : "block"}>
      {para.split('|').map((seg, si) =>
        seg ? <span key={si} className="inline-block">{seg}</span> : null
      )}
    </span>
  ));
}

export default function FaqAccordion() {
  const [openIndices, setOpenIndices] = useState<number[]>([]);

  const toggle = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="w-full mx-auto space-y-0 divide-y divide-[#8e735b]/20 border-t border-b border-[#8e735b]/20">
      {faqItems.map((item, index) => {
        const isOpen = openIndices.includes(index);
        return (
          <div key={index} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between py-5 md:py-6 text-left gap-4 hover:opacity-70 transition-all duration-200 cursor-pointer group"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-4 flex-1">
                <span className="text-[#8e735b] font-bold text-base shrink-0 font-shippori">Q.</span>
                <span className="text-[#2c221a] text-[13.5px] md:text-[15px] tracking-wide font-bold group-hover:text-[#8e735b] transition-colors duration-200">
                  {item.question}
                </span>
              </span>
              <span
                className={`shrink-0 text-[#8e735b] opacity-75 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {/* 確実に動くように max-height を使用してアニメーション */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="flex items-start gap-4 pb-6 pt-1">
                <span className="text-[#8e735b]/60 font-bold text-base shrink-0 font-shippori">A.</span>
                <p className="text-[#2c221a]/90 text-[13px] md:text-[14.5px] leading-[2.2] font-medium tracking-wide">
                  {renderFaqAnswer(item.answer)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}