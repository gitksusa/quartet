import type { Metadata } from "next";
import Image from "next/image";
import React from "react";
import RecruitHeader from "@/components/recruit/RecruitHeader";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import FloatingNav from "@/components/recruit/FloatingNav";

// 💡 今回切り出した部品をインポートします
import SectionHeading from "@/components/recruit/shared/SectionHeading";
import FaqBlock from "@/components/recruit/blocks/FaqBlock";
import StrengthsBlock from "@/components/recruit/blocks/StrengthsBlock";
import HeroBlock from "@/components/recruit/blocks/HeroBlock";
import AboutBlock from "@/components/recruit/blocks/AboutBlock";
import InstagramBlock from "@/components/recruit/blocks/InstagramBlock";
import StepsBlock from "@/components/recruit/blocks/StepsBlock";
import WantedBlock from "@/components/recruit/blocks/WantedBlock";
import RequirementsBlock from "@/components/recruit/blocks/RequirementsBlock";
import AccessBlock from "@/components/recruit/blocks/AccessBlock";
import ContactBlock from "@/components/recruit/blocks/ContactBlock";

export const metadata: Metadata = {
  title: '川越のネイリスト求人 | 未経験歓迎・正社員募集のネイルサロンenu',
  description: '埼玉県・本川越駅すぐのネイルサロンenuでは、正社員ネイリスト（アシスタント）を求人中！未経験歓迎・ネイルスクール卒業の方も安心の研修あり。ニュアンス、韓国、アートなど最新トレンドネイルが学べます。試用期間1,150円〜。',
};

type Props = {
  params: Promise<{ tenantId: string }>;
};

function renderWrapped(text: string) {
  return text.split('\n\n').map((para, pi) => (
    <span key={pi} className={pi > 0 ? "block mt-4" : "block"}>
      {para.split('|').map((seg, si) =>
        seg ? <span key={si} className="inline-block">{seg}</span> : null
      )}
    </span>
  ));
}

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

// ─── 募集要項データ ────────────────────────────────────────
const jobDetails: { label: string; items: React.ReactNode[]; icon: string }[] = [
  { 
    label: "雇用形態", 
    items: [
      <span key="1" className="block text-[13px] md:text-[0.95rem] text-[#2c221a] font-semibold">正社員</span>
    ],
    icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.5c0-2.33 4.67-3.5 7-3.5s7 1.17 7 3.5v.5z"
  },
  { 
    label: "給与", 
    items: [
      <span key="1" className="block text-[14px] md:text-[1rem] text-[#2c221a] font-bold mb-4 border-b border-[#eadecf] pb-2 inline-block">
        試用期間：時給 1,150円〜
      </span>,
      <span key="2" className="block text-[13px] md:text-[0.95rem] text-[#2c221a] font-bold mb-1">
        未経験
      </span>,
      <span key="3" className="block text-[13px] md:text-[0.95rem] text-[#2c221a]/90 pl-3 md:pl-4 mb-4">
        <span className="font-semibold">月給 210,000円〜</span>
      </span>,
      <span key="4" className="block text-[13px] md:text-[0.95rem] text-[#2c221a] font-bold mb-1">
        経験者
      </span>,
      <span key="5" className="block text-[13px] md:text-[0.95rem] text-[#2c221a]/90 pl-3 md:pl-4 mb-4">
        <span className="font-semibold">月給 220,000円〜</span>
      </span>,
      <span key="6" className="block text-[#8e735b] text-[12px] md:text-[13px] font-bold bg-[#8e735b]/5 border border-[#8e735b]/20 rounded-lg px-3 py-1.5 inline-block tracking-wide mt-1">
        ※技術・売上に応じて優遇あり◎
      </span>
    ],
    icon: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 3.98 2.53.47 3 1.34 3 2.34 0 1.05-.78 1.92-3 1.92-2.19 0-3-.99-3.11-2.2H4.04c.09 1.97 1.45 3.48 3.46 3.97V21h3v-2.13c2.02-.35 3.5-1.5 3.5-3.55 0-2.54-1.97-3.32-4.7-3.82z"
  },
  { 
    label: "待遇・福利厚生", 
    items: ["社会保険完備", "歩合給あり", "昇給随時", "交通費支給（1万円まで）"].map((text, i) => (
      <span key={i} className="block text-[13px] md:text-[0.95rem] mb-1.5 text-[#2c221a] font-semibold">{text}</span>
    )),
    icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
  },
  { 
    label: "休日", 
    items: ["完全週休2日制", "年末年始休暇あり（12/31〜1/3）", "有休完全消化", "土日希望休相談可◎"].map((text, i) => (
      <span key={i} className="block text-[13px] md:text-[0.95rem] mb-1.5 text-[#2c221a] font-semibold">{text}</span>
    )),
    icon: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"
  },
  { 
    label: "勤務地", 
    items: ["西武新宿線 本川越駅 徒歩0分", "東武東上線 川越市駅 徒歩5分"].map((text, i) => (
      <span key={i} className="block text-[13px] md:text-[0.95rem] mb-1.5 text-[#2c221a] font-semibold">{text}</span>
    )),
    icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
  },
  { 
    label: "勤務時間", 
    items: ["平日 11:00〜20:00", "土日祝 9:30〜18:30", "シフト制"].map((text, i) => (
      <span key={i} className="block text-[13px] md:text-[0.95rem] mb-1.5 text-[#2c221a] font-semibold">{text}</span>
    )),
    icon: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
  },
];

const strengthCards = [
  { num: "01", title: "デビュー前に|しっかりと技術を|身につけられます", body: "モデル様に|ご協力いただきながら、|段階的に経験を積める環境を|整えています。\n\n技術だけでなく、|「対応力」や「提案力」も|身につけながら、|少しずつ成長していけます。" },
  { num: "02", title: "技術も接客も大切に", body: "ただ技術が|できるだけではなく、|「またお願いしたい」と|思っていただける|接客や対応力も|大切にしています。\n\nネイリストとして、|長く活躍できる力を|育てていきます。" },
  { num: "03", title: "駅近で通いやすい", body: "本川越駅徒歩0分。|通勤しやすく、|お客様にも|通っていただきやすい立地です。" },
  { num: "04", title: "長く働ける環境づくり", body: "経験を積みながら|高単価技術・育成・|マネジメント・店長など、|キャリアアップも目指せる環境を|整えていきます。" },
];

const steps = [
  { num: "01", phase: "入社", title: "サロン内研修・基本習得", body: "enuの理念や接客マナー、|ベース技術を|マニュアルに沿って学びます。" },
  { num: "02", phase: "モデル練習", title: "モデル施術・技術練習", body: "課題練習や、|モデル様に|ご協力いただきながら、|技術や接客を|身につけていきます。" },
  { num: "03", phase: "チェック", title: "技術チェック・合格", body: "仕上がりや持ち、接客の|最終チェックを|オーナーと共に行い、|デビューを決定します。" },
  { num: "04", phase: "デビュー", title: "ネイリストデビュー！", body: "お客様の入客がスタート！|デビュー後も|トレンド技術の習得を|継続的にサポートします。" },
];

const wantedItems = [
  { iconPath: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", text: "ネイルが本当に好き" },
  { iconPath: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z", text: "可愛い世界観が好き" },
  { iconPath: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z", text: "色んなアートができるようになりたい" },
  { iconPath: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", text: "接客が好き" },
  { iconPath: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z", text: "ネイリストとして自信を持ちたい" },
  { iconPath: "M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm1 10h3l-4-4-4 4h3v4h2v-4z", text: "SNSが好き" },
  { iconPath: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", text: "仲間と一緒に高め合いたい" },
  { iconPath: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z", text: "今は自信ないけど成長したい" },
];

export default async function RecruitPage({ params }: Props) {
  await params;

  return (
    <>
      <RecruitHeader />
      <FloatingNav />

      <style>{`
        @keyframes powa {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.03); filter: brightness(1.05); }
        }
        .animate-powa {
          animation: powa 8s ease-in-out infinite;
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.04); }
          30% { transform: scale(1); }
          45% { transform: scale(1.04); }
          60% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 2.5s infinite;
        }
      `}</style>

      <main className="font-shippori bg-[#eadecf] text-[#2c221a] antialiased tracking-wide font-medium overflow-x-hidden relative">

        {/* 1. HERO */}
        <HeroBlock />

        {/* 2. ABOUT */}
        <AboutBlock />

        {/* 3. STRENGTHS */}
        <StrengthsBlock cards={strengthCards} renderWrapped={renderWrapped} />

        {/* 4. INSTAGRAM */}
        <InstagramBlock />

        {/* 5. STEPS */}
        <StepsBlock steps={steps} renderWrapped={renderWrapped} />

        {/* 6. WANTED */}
        <WantedBlock items={wantedItems} />

        {/* 7. REQUIREMENTS */}
        <RequirementsBlock details={jobDetails} />

        {/* 8. FAQ */}
        <FaqBlock />

        {/* 9. ACCESS */}
        <AccessBlock />

        {/* 10. CONTACT */}
        <ContactBlock />

        {/* FOOTER */}
        <footer className="py-8 bg-[#2c221a] text-white/40 text-center text-[10px] md:text-xs tracking-widest font-sans"><p>© enu</p></footer>
      </main>
    </>
  );
}