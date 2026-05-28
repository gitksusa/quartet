"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "未経験でも大丈夫ですか？",
    answer:
      '大丈夫です。enuでは、"未経験から育てる"ことを前提にしています。技術マニュアルやチェック制度も整えながら、段階的にデビューを目指します。',
  },
  {
    question: "デビューまでどれくらいですか？",
    answer: "1ヶ月半〜3ヶ月でのデビューを目指します。一人ひとりの成長スピードに合わせて進めますのでご安心ください。",
  },
  {
    question: "技術に自信がなくても大丈夫ですか？",
    answer:
      "大丈夫です。完璧な技術を求めているわけではありません。不安なことや迷うことがあれば、相談しながら進めていける方を歓迎しています。",
  },
  {
    question: "すぐ入客しますか？",
    answer:
      "いいえ。技術チェックを段階的に行い、合格してからデビューとなります。モデル様はサロン側で手配しますのでご安心ください。",
  },
  {
    question: "ノルマはありますか？",
    answer:
      "個人ノルマというより、チームで成長していくことを大切にしています。",
  },
  {
    question: "どんなお客様が多いですか？",
    answer:
      "落ち着いた雰囲気のお客様が多いです。「安心して通える場所」を求めて来てくださる方が多く、丁寧なカウンセリングやコミュニケーションを大切にしています。",
  },
  {
    question: "サロンの雰囲気はどんな感じですか？",
    answer:
      "少人数で、落ち着いた雰囲気のサロンです。現在はオーナー1人で運営しており、これから一緒にサロンをつくっていく段階です。お客様ともスタッフとも、穏やかに向き合える環境を大切にしています。",
  },
  {
    question: "扶養内勤務や短時間勤務は可能ですか？",
    answer:
      "可能です。ライフスタイルやご家庭の状況に合わせて、無理のない働き方を一緒に相談しながら決めていきたいと考えています。まずは面談でご希望をお聞かせください。",
  },
  {
    question: "モデル集めは必要ですか？",
    answer:
      "基本的なモデル募集はサロン側で行います。練習段階や技術レベルに合わせて、サロンが責任をもってモデルさんを手配します。ご本人のご家族やご友人にお願いできる場合は歓迎ですが、必須ではありません。",
  },
];

export default function FaqAccordion() {
  // 複数開けるように配列で管理します
  const [openIndices, setOpenIndices] = useState<number[]>([]);

  const toggle = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-0 divide-y divide-[#b09880]/20 border-t border-b border-[#b09880]/20">
      {faqItems.map((item, index) => {
        const isOpen = openIndices.includes(index);
        return (
          <div key={index} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between py-5 text-left gap-4 hover:opacity-70 transition-all duration-200 cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-4 flex-1">
                <span className="text-[#b09880] font-light text-sm shrink-0 font-shippori">
                  Q.
                </span>
                <span className="text-[#3a3028]/90 text-[13.5px] md:text-sm tracking-wide font-normal">
                  {item.question}
                </span>
              </span>
              <span
                className={`shrink-0 text-[#b09880] opacity-60 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 6L8 11L13 6"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex items-start gap-4 pb-6 pt-1">
                  <span className="text-[#b09880] font-light text-sm shrink-0 font-shippori">
                    A.
                  </span>
                  <p className="text-[#3a3028]/80 text-[13px] md:text-sm leading-[2.1] font-light">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}