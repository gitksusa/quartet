import type { Metadata } from "next";
import Image from "next/image";
import RecruitHeader from "@/components/recruit/RecruitHeader";
import FaqAccordion from "@/components/recruit/FaqAccordion";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import FloatingNav from "@/components/recruit/FloatingNav";
import React from "react";

// 修正点1・2：SEOに最強のキーワード（埼玉、本川越、未経験歓迎、正社員、スクール卒業、ニュアンス、韓国など）を自然な文章で組み込んだメタデータ
export const metadata: Metadata = {
  title: '川越のネイリスト求人 | 未経験歓迎・正社員募集のネイルサロンenu',
  description: '埼玉県・本川越駅すぐのネイルサロンenuでは、正社員ネイリスト（アシスタント）を求人中！未経験歓迎・ネイルスクール卒業の方も安心の研修あり。ニュアンス、韓国、アートなど最新トレンドネイルが学べます。試用期間1,150円〜。',
};

// 修正点1：フォルダ構造変更に合わせて、パラメータを salon_slug から tenantId に変更
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
      // 修正点3：給与の表記を指示書の通りに変更・並び替え
      <span key="1" className="block text-[14px] md:text-[1rem] text-[#2c221a] font-bold mb-4 border-b border-[#eadecf] pb-2 inline-block">
        試用期間：時給 1,150円〜
      </span>,
      <span key="2" className="block text-[13px] md:text-[0.95rem] text-[#2c221a] font-bold mb-1">
        未経験（正社員）
      </span>,
      <span key="3" className="block text-[13px] md:text-[0.95rem] text-[#2c221a]/90 pl-3 md:pl-4 mb-4">
        <span className="font-semibold">月給 210,000円〜</span>
      </span>,
      <span key="4" className="block text-[13px] md:text-[0.95rem] text-[#2c221a] font-bold mb-1">
        経験者（正社員）
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
  { num: "02", title: "技術も接客も大切に", body: "ただ技術が|できるだけではなく、|「またお願いしたい」と|思っていただける|接客や対応力も|大切にしています。\n\nネイリストとして、|長く活躍できる力を|育ててしていきます。" },
  { num: "03", title: "駅近で通いやすい", body: "本川越駅徒歩0分。|通勤しやすく、|お客様にも|通っていただきやすい立地です。" },
  { num: "04", title: "長く働ける環境づくり", body: "経験を積みながら|高単価技術・育成・|マネジメント・店長など、|キャリアアップも目指せる環境を|整えてしていきます。" },
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

function SectionHeading({ en, ja, center = false }: { en: string; ja: string; center?: boolean }) {
  return (
    <ScrollReveal animation="fade-up">
      <div className={`relative mb-14 md:mb-24 ${center ? "text-center" : "text-left"}`}>
        <div className={`absolute -top-6 ${center ? "left-1/2 -translate-x-1/2" : "-left-4 md:-left-6"} w-40 h-16 md:w-56 md:h-24 opacity-[0.04] pointer-events-none mix-blend-multiply`}>
           <Image src="/images/recruit/logo.jpg" alt="" fill className="object-contain" />
        </div>

        <div className={`relative z-10 flex items-center gap-3 mb-4 ${center ? "justify-center" : "justify-start"}`}>
          <div className="w-8 h-[1px] bg-[#a48a71]/40" />
          <p className="text-[#a48a71] text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-semibold">
            {en}
          </p>
          <div className="w-8 h-[1px] bg-[#a48a71]/40" />
        </div>
        <div className="relative z-10 inline-block px-8 md:px-12">
          <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30" viewBox="0 0 40 20">
            <path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <h2 className="text-xl md:text-3xl font-medium tracking-[0.15em] text-[#2c221a] font-shippori relative z-10">
            {ja}
          </h2>
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30 rotate-180" viewBox="0 0 40 20">
            <path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      </div>
    </ScrollReveal>
  );
}

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
        <section id="top" className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-32 md:pb-24">
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

        {/* 2. ABOUT */}
        <section id="about" className="py-24 md:py-48 px-6 bg-[#eadecf] relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none"><Image src="/images/recruit/interior_03.jpg" alt="interior deco" fill className="object-cover" /></div>
          
          <div className="max-w-4xl mx-auto md:grid md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-24 items-center relative z-10">
            <ScrollReveal animation="fade-up" className="w-full">
              <div className="flex items-center justify-between md:block mb-8 md:mb-0">
                <div className="relative text-left">
                  <div className="absolute -top-6 -left-4 md:-left-6 w-40 h-16 md:w-56 md:h-24 opacity-[0.04] pointer-events-none mix-blend-multiply"><Image src="/images/recruit/logo.jpg" alt="" fill className="object-contain" /></div>
                  <div className="relative z-10 flex items-center gap-3 mb-4 justify-start"><div className="w-8 h-[1px] bg-[#a48a71]/40" /><p className="text-[#a48a71] text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-semibold">ABOUT US</p><div className="w-8 h-[1px] bg-[#a48a71]/40" /></div>
                  <div className="relative z-10 inline-block px-8 md:px-12">
                    <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30" viewBox="0 0 40 20"><path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <h2 className="text-xl md:text-3xl font-medium tracking-[0.15em] text-[#2c221a] font-shippori relative z-10">enuについて</h2>
                    <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-6 md:w-8 h-3 md:h-4 text-[#a48a71]/30 rotate-180" viewBox="0 0 40 20"><path d="M40 10 C30 10, 20 0, 0 10 C20 20, 30 10, 40 10" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </div>
                </div>
                <div className="block md:hidden w-[120px] sm:w-[160px] shrink-0 relative ml-4">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md animate-powa"><Image src="/images/recruit/interior_02.jpg" alt="enu nailsalon サロン内装" fill className="object-cover" sizes="120px" /></div>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6 text-[#2c221a] text-[13px] md:text-base leading-[2.2] md:leading-[2.5] font-medium mt-6 md:mt-12">
                <p><W>enuは、</W><W>「通いやすい価格で、</W><W>毎日ちょっと気分が上がる</W><W>ネイルを楽しめる」</W><W>そんな想いから生まれた</W><W>ニュアンスネイルサロンです。</W></p>
                <p><span className="font-semibold border-b border-[#a48a71] inline-block">girly nuance × mood design</span> <W>を軸に、</W><W>ちゅるん系・淡色ニュアンス・</W><W>抜け感デザインなど、</W><W>"女性らしい雰囲気"を</W><W>大切にしたデザインを</W><W>ご提案しています。</W></p>
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

        {/* 3. STRENGTHS */}
        <section id="strengths" className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="STRENGTHS" ja="enuで働く4つの強み" center />

            <div className="grid md:grid-cols-2 gap-x-16 gap-y-16">
              {strengthCards.map((card) => (
                <ScrollReveal key={card.num} animation="fade-up" className="relative group text-center flex flex-col items-center w-full" >
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

        {/* 4. INSTAGRAM */}
        <section className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-4xl mx-auto text-center">
            <SectionHeading en="INSTAGRAM" ja="公式Instagram" center />
            <ScrollReveal animation="fade-up">
              <p className="text-[#2c221a] text-sm md:text-base leading-[2.2] mb-10 max-w-xl mx-auto font-medium">
                <W>enuの最新ニュアンスデザインや</W><W>サロンの雰囲気を</W><W>公式Instagramにて発信しています。</W><W>ぜひ世界観をチェックしてみてください。</W>
              </p>
              <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-[2.5rem] p-6 md:p-12 max-w-2xl mx-auto shadow-sm">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-[#8e735b]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <div className="text-[#8e735b] text-[15px] font-bold tracking-widest font-sans pt-1">@enu_kawagoe</div>
                </div>
                <p className="text-[11px] text-[#2c221a]/60 mb-6">girly nuance × mood design</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-8">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="aspect-square relative rounded-xl overflow-hidden shadow-sm bg-black/5 hover:opacity-80 transition-opacity">
                      <Image src={`/images/recruit/nail_0${num}.jpg`} alt="Instagram nail post" fill className="object-cover" sizes="(max-width: 768px) 33vw, 16vw"/>
                    </div>
                  ))}
                </div>
                <a href="https://www.instagram.com/enu_kawagoe/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#b09880] to-[#8e735b] text-white font-semibold text-sm px-10 py-4 rounded-full shadow-md hover:scale-105 transition-transform duration-300 w-full">
                  Instagramを見る
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* 5. STEPS */}
        <section id="steps" className="py-24 md:py-48 px-6 bg-[#dfd2c1] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"><Image src="/images/recruit/interior_04.jpg" alt="interior deco" fill className="object-cover" /></div>

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

                {/* 右スワイプ用矢印ボタン (スマホ等のみ表示) */}
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

        {/* 6. WANTED */}
        <section id="wanted" className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="WANTED" ja="こんな子に来てほしい" center />
            
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto mb-20 md:mb-32">
              {wantedItems.map((item, i) => (
                <ScrollReveal key={i} animation="fade-up" className="flex items-center gap-4 md:gap-6 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/30 border border-white/50 hover:bg-white/60 transition-all duration-500 group shadow-sm hover:shadow-md">
                  <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#dfd2c1] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-[#8e735b]" viewBox="0 0 24 24" fill="currentColor"><path d={item.iconPath} /></svg>
                  </div>
                  <span className="text-[13px] md:text-[0.95rem] font-semibold tracking-wide text-[#2c221a] inline-block">{item.text}</span>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal animation="fade-up" className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] md:rounded-[3rem] py-12 md:py-20 px-6 md:px-16 max-w-3xl mx-auto border border-white/60 shadow-xl relative">
              <div className="flex flex-col items-center gap-5 md:gap-6 mb-10 md:mb-12">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-[#8e735b]/40 shrink-0 shadow-md">
                  <Image src="/images/recruit/owner_02.jpg" alt="enuオーナー" fill className="object-cover" sizes="96px" />
                </div>
                <h3 className="text-[17px] md:text-xl font-bold tracking-[0.1em] text-[#2c221a] border-b border-[#8e735b]/30 pb-3 font-shippori animate-heartbeat">
                  【 オーナーの想い 】
                </h3>
              </div>
              
              <div className="space-y-6 md:space-y-8 text-[#2c221a]/90 text-[13px] md:text-[15px] leading-[2.4] md:leading-[2.5] font-medium max-w-[600px] mx-auto text-center sm:text-left">
                <p><W>私は、</W><W>目の前のお客様一人ひとりが</W><W>ネイルを通して</W><W>少しでも前向きになれたり、</W><W>日常が明るくなるような時間を</W><W>届けたいと思い、</W><W>ネイリストになりました。</W></p>
                <p><W>実際にサロンワークを</W><W>していると</W><span className="block mt-2"></span><span className="font-semibold text-[#8e735b] inline-block">「ネイルがあるだけで気分が変わる」</span><span className="block mt-1"></span><span className="font-semibold text-[#8e735b] inline-block">「ここに来るのが楽しみ」</span><span className="block mt-2"></span><W>そう言っていただけることが</W><W>本当に多く、</W><W>ネイルは“ただの施術”ではなく、</W><W>人の気持ちに寄り添える</W><W>仕事だと感じています。</W></p>
                <p><W>だからこそ、</W><W>目の前のお客様を</W><W>幸せにできるネイリストを</W><W>増やしていきたいと</W><W>思っています。</W></p>
                <div className="py-6 border-y border-[#8e735b]/20 text-center sm:text-left mt-8 mb-8">
                  <p className="mb-3"><W>ただ一方で、</W></p>
                  <ul className="inline-block text-left space-y-1.5 mb-4 font-semibold text-[13.5px] md:text-[15px]"><li>・未経験だと働ける場所が少ない</li><li>・技術に自信がなくて続けられない</li></ul>
                  <p><W>そんな理由で、</W><W>こんなにやりがいがあり、</W><W>人を幸せにできる</W><W>ネイリストという仕事を</W><W>諦めてしまう人が多いのも</W><W>現実です。</W></p>
                </div>
                <p><W>だから私は、</W><W>未経験からでも</W><W>安心して続けられる環境を</W><W>作ると決めました。</W></p>
                <ul className="flex flex-col gap-2 items-center sm:items-start font-bold text-[#8e735b] bg-[#dfd2c1]/30 p-5 rounded-2xl w-full"><li>✔ 正社員としての安定した雇用</li><li>✔ マニュアルに基づいた技術習得</li><li>✔ チームで支え合う働き方</li></ul>
                <p><span className="font-semibold text-[#8e735b] inline-block">「自分にできるか不安」</span><span className="font-semibold text-[#8e735b] inline-block">「ついていけるか心配」</span><span className="block mt-2"></span><W>そんな方でも</W><W>“ここなら大丈夫”と</W><W>思ってもらえる環境を</W><W>準備しています。</W></p>
                <p className="text-[13.5px] md:text-base font-semibold leading-[2.2] border-b border-[#8e735b]/10 pb-6 mt-4">
                  <W>ネイルの仕事は</W><W>長く続けることで、</W><W>やりがいや楽しさが</W><W>増えていく仕事です。</W><span className="block mt-4"></span><W>これからのみんなが</W><W>「ここで働けてよかった」と</W><W>思えるようなサロンを、</W><W>一緒に楽しく作っていける方と</W><W>出会えたら嬉しいです。</W>
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* 7. REQUIREMENTS */}
        <section id="requirements" className="py-24 md:py-48 px-4 sm:px-6 bg-[#dfd2c1]">
          <div className="max-w-3xl mx-auto">
            <SectionHeading en="REQUIREMENTS" ja="募集要項" center />
            <ScrollReveal animation="fade-up" className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-8 md:p-12 border border-white/60 shadow-xl divide-y divide-[#8e735b]/20">
              {jobDetails.map((row) => (
                <div key={row.label} className="grid grid-cols-[75px_1fr] md:grid-cols-[160px_1fr] gap-3 sm:gap-4 py-6 md:py-8 items-start">
                  <dt className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-3 text-center md:text-left">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#eadecf] flex items-center justify-center text-[#8e735b] shrink-0 shadow-sm">
                      <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d={row.icon} /></svg>
                    </div>
                    <span className="text-[10px] md:text-sm tracking-tighter md:tracking-[0.15em] text-[#8e735b] font-bold uppercase block leading-tight">
                      {row.label.includes("・") ? (
                        <>
                          <span className="block md:inline">待遇</span>
                          <span className="hidden md:inline">・</span>
                          <span className="block md:inline">福利厚生</span>
                        </>
                      ) : row.label}
                    </span>
                  </dt>
                  <dd className="pl-1 sm:pl-2 md:pl-4 text-left">
                    <div className="space-y-1">{row.items}</div>
                  </dd>
                </div>
              ))}
            </ScrollReveal>
          </div>
        </section>

        {/* 8. FAQ */}
        <section id="faq" className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="FAQ" ja="よくある質問" center />
            <ScrollReveal animation="fade-up" className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-[2.5rem] p-6 md:p-12 shadow-sm max-w-3xl mx-auto">
              <FaqAccordion />
            </ScrollReveal>
          </div>
        </section>

        {/* 9. ACCESS */}
        <section className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
          <div className="max-w-5xl mx-auto">
            <SectionHeading en="ACCESS" ja="アクセス" center />
            <ScrollReveal animation="fade-up" className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <dl className="divide-y divide-[#8e735b]/30 border-y border-[#8e735b]/30">
                {[
                  { dt: "店舗名", dd: "enu" },
                  { dt: "電話番号", dd: <a href="tel:05031451101" className="hover:underline text-[#8e735b] font-bold">050-3145-1101</a> },
                  { dt: "住所", dd: <><W>〒350-0042</W> <W>埼玉県川越市中原町2-25-4</W><br /><W>ライラックヴィラⅠ番館302号室</W><div className="mt-2"><a href="https://maps.apple.com/?q=埼玉県川越市中原町2-25-4+ライラックヴィラ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#8e735b]/70 hover:text-[#8e735b] underline"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" /></svg>iPhoneのマップはこちら</a></div></>},
                  { dt: "アクセス", dd: <>
                    <div className="flex items-center gap-2 mb-2">
                      <img src="/S__4096016_0.jpg" alt="西武線" className="w-[18px] h-[18px] md:w-5 md:h-5 object-cover rounded-sm flex-shrink-0" />
                      <span><W>西武新宿線 本川越駅</W> <W>徒歩0分</W></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="/S__4096015_0.jpg" alt="東武線" className="w-[18px] h-[18px] md:w-5 md:h-5 object-cover rounded-sm flex-shrink-0" />
                      <span><W>東武東上線 川越市駅</W> <W>徒歩5分</W></span>
                    </div>
                  </> }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 py-4 md:py-5 items-start">
                    <dt className="text-[11px] md:text-sm text-[#8e735b] font-bold tracking-wider">{row.dt}</dt>
                    <dd className="text-[12.5px] md:text-[0.95rem] text-[#2c221a] leading-relaxed font-semibold">{row.dd}</dd>
                  </div>
                ))}
              </dl>
              <div className="w-full aspect-[4/3] md:aspect-square rounded-[2rem] overflow-hidden shadow-md border border-white/40 relative">
                <iframe src="https://maps.google.com/maps?q=埼玉県川越市中原町2-25-4+(enu)&output=embed&z=16&hl=ja" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="enu nailsalon 位置情報" className="absolute inset-0" />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* 10. CONTACT */}
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
                {/* 修正点：ページ最下部のホームページへのリンクURLからも /s/ を消去しました */}
                <a href="https://qrtt.jp/enu" className="group block relative w-32 md:w-40 h-16 md:h-20 transition-transform duration-500 hover:scale-105"><Image src="/images/recruit/logo.jpg" alt="enu logo" fill className="object-contain" /></a>
                <a href="https://qrtt.jp/enu" className="text-[10px] md:text-[11px] text-[#8e735b] tracking-[0.2em] border-b border-[#8e735b]/40 pb-1 hover:opacity-60 transition-opacity duration-300 font-semibold mt-4">enu Official Website</a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 bg-[#2c221a] text-white/40 text-center text-[10px] md:text-xs tracking-widest font-sans"><p>© enu</p></footer>
      </main>
    </>
  );
}