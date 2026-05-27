import type { Metadata } from "next";
import Image from "next/image";
import RecruitHeader from "@/components/recruit/RecruitHeader";

export const metadata: Metadata = {
  title: "求人募集 | enu nailsalon",
  description:
    "川越のネイルサロン「enu」のスタッフ求人情報。未経験歓迎・育成型サロン。girly nuance × mood design。本川越駅徒歩0分。",
};

type Props = {
  params: Promise<{ salon_slug: string }>;
};

// ─── データ ────────────────────────────────────────────────────

const strengthCards = [
  { num: "01", title: "実践型だから成長が早い", body: "見て学ぶだけのサロンではありません。数をこなすことで技術だけでなく「対応力」も身につきます。モデル様はサロン側で用意するため、しっかり実務経験を積んでからのデビューが可能です。" },
  { num: "02", title: "未経験からでも育成前提", body: "「これから成長したい」その気持ちを大切にしています。技術マニュアルやチェック制度を整えながら、段階的にデビューを目指します。" },
  { num: "03", title: "駅近で通いやすい", body: "本川越駅徒歩0分。通勤しやすく、お客様にも通っていただきやすい立地です。" },
  { num: "04", title: "長く働ける環境づくり", body: "経験を積みながら高単価技術・育成・マネジメント・店長など、キャリアアップも目指せる環境を整えていきます。" },
];

const steps = [
  { num: "01", phase: "入社", title: "サロン内研修・基本習得", body: "enuの理念や接客マナー、ベース技術をマニュアルに沿って学びます。" },
  { num: "02", phase: "モデル練習", title: "モデル施術・実践", body: "サロンが手配するモデル様へ実際に施術。スピードとクオリティを磨きます。" },
  { num: "03", phase: "チェック", title: "技術チェック・合格", body: "仕上がりや持ち、接客の最終チェックをオーナーと共に行い、デビューを決定します。" },
  { num: "04", phase: "デビュー", title: "ネイリストデビュー！", body: "お客様の入客がスタート！デビュー後もトレンド技術の習得を継続的にサポートします。" },
];

const jobDetails = [
  { 
    label: "雇用形態", 
    items: ["正社員"],
    icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.5c0-2.33 4.67-3.5 7-3.5s7 1.17 7 3.5v.5z"
  },
  { 
    label: "給与", 
    items: [
      "未経験（正社員）",
      "　試用期間：時給 1,150円〜",
      "　デビュー後：月給 210,000円〜",
      "経験者（全メニューデビュー済）",
      "　月給 220,000円〜",
      "　※技術・売上に応じて優遇あり◎",
    ],
    icon: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 3.98 2.53.47 3 1.34 3 2.34 0 1.05-.78 1.92-3 1.92-2.19 0-3-.99-3.11-2.2H4.04c.09 1.97 1.45 3.48 3.46 3.97V21h3v-2.13c2.02-.35 3.5-1.5 3.5-3.55 0-2.54-1.97-3.32-4.7-3.82z"
  },
  { 
    label: "待遇・福利厚生", 
    items: ["社会保険完備", "歩合給あり", "昇給随時", "交通費支給（1万円まで）"],
    icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
  },
  { 
    label: "休日", 
    items: ["完全週休2日制", "年末年始休暇あり（12/31〜1/3）", "有休完全消化", "土日希望休相談可◎"],
    icon: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"
  },
  { 
    label: "勤務地", 
    items: ["西武新宿線 本川越駅 徒歩0分", "東武東上線 川越市駅 徒歩5分"],
    icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
  },
  { 
    label: "勤務時間", 
    items: ["平日 11:00〜20:00", "土日祝 9:30〜18:30", "シフト制"],
    icon: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
  },
];

const faqItems = [
  { question: "未経験でも大丈夫ですか？", answer: '大丈夫です。enuでは、"未経験から育てる"ことを前提にしています。段階的にデビューを目指します。' },
  { question: "技術に自信がなくても大丈夫ですか？", answer: "大丈夫です。完璧な技術を求めているわけではありません。相談しながら進めていける方を歓迎しています。" },
  { question: "すぐ入客しますか？", answer: "いいえ。技術チェックを行い、合格してからデビューとなります。モデル様はサロン側で手配します。" },
  { question: "ノルマはありますか？", answer: "個人ノルマより、チームで成長していくことを大切にしています。" },
  { question: "扶養内勤務や短時間勤務は可能ですか？", answer: "可能です。ライフスタイルに合わせて、無理のない働き方を一緒に相談しながら決めていきましょう。" },
  { question: "モデル集めは必要ですか？", answer: "基本的な募集はサロン側で行いますのでご安心ください。ご家族やご友人にお願いできる場合は歓迎です。" },
];

const wantedItems = [
  { iconPath: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", text: "ネイルが本当に好き" },
  { iconPath: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z", text: "可愛い世界観が好き" },
  { iconPath: "M20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 4.42 8 12 8 12s8-7.58 8-12z", text: "今は自信ないけど成長したい" },
  { iconPath: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z", text: "ARTへの努力を楽しめる" },
  { iconPath: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", text: "お客様と向き合いたい" },
  { iconPath: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z", text: "「仕事が好き」と胸を張りたい" },
  { iconPath: "M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm1 10h3l-4-4-4 4h3v4h2v-4z", text: "SNSが好き" },
  { iconPath: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", text: "仲間と一緒に高め合いたい" },
];

// ─── セクション見出し（背景ロゴ透かし演出） ──────────────────────────

function SectionHeading({ en, ja, center = false }: { en: string; ja: string; center?: boolean }) {
  return (
    <div className={`relative mb-16 md:mb-24 ${center ? "text-center" : "text-left"}`}>
      {/* 背景に上品に透ける店舗のロゴマーク */}
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
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ─── ページ本体 ──────────────────────────────────────────────────

export default async function RecruitPage({ params }: Props) {
  await params;

  return (
    <>
      <RecruitHeader />

      <main className="font-shippori bg-[#eadecf] text-[#2c221a] antialiased tracking-wide font-medium overflow-x-hidden relative">

        {/* ══════════════════════════════════════════
            ★ 右下常時追従（フローティング）ボタン
        ══════════════════════════════════════════ */}
        <div className="fixed bottom-6 right-4 md:right-8 z-50 flex flex-col gap-3">
          {/* TOPボタン */}
          <a
            href="#top"
            className="w-12 h-12 bg-white/80 backdrop-blur-md border border-[#8e735b]/20 text-[#8e735b] rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-white transition-all duration-300 group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <span className="text-[8px] tracking-wider uppercase font-bold mt-0.5 font-shippori">Top</span>
          </a>

          {/* LINE問い合わせボタン */}
          <a
            href="#contact"
            className="w-14 h-14 bg-[#06C755] text-white rounded-full flex flex-col items-center justify-center shadow-xl hover:bg-[#05b34c] hover:scale-105 transition-all duration-300 group"
          >
            <LineIcon className="w-5 h-5 transform group-hover:rotate-12 transition-transform" />
            <span className="text-[9px] font-bold tracking-tighter mt-0.5">問い合わせ</span>
          </a>
        </div>

        {/* ══════════════════════════════════════════
            1. HERO (スマホ対応強化)
        ══════════════════════════════════════════ */}
        <section id="top" className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-32 md:pb-24">
          <Image
            src="/images/recruit/interior_01.jpg"
            alt="enu nailsalon 内装"
            fill
            priority
            className="object-cover scale-110 filter blur-[0.5px] brightness-[0.7]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2c221a]/60 via-[#2c221a]/40 to-[#eadecf]" />

          <div className="relative z-10 text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center w-full">
            {/* block! 指定でスマホ・PC問わず絶対に非表示にならない構造へ */}
            <p className="block text-[10px] md:text-[11px] tracking-[0.6em] text-white/80 uppercase mb-5 font-semibold drop-shadow-sm">
              enu nailsalon recruitment
            </p>
            
            <h1 className="text-2xl md:text-[3rem] font-semibold text-white tracking-[0.2em] leading-[2.1] mb-10 font-shippori drop-shadow-[0_4px_20px_rgba(27,20,15,0.9)]">
              自信を持って働ける<br className="md:hidden" />ネイリストを育てたい。
            </h1>

            <div className="w-16 md:w-20 h-[1px] bg-[#c4ab93] mx-auto mb-10 opacity-70" />

            <div className="flex flex-col items-center justify-center gap-3 md:gap-4 text-white/95 text-xs md:text-base tracking-[0.25em] md:tracking-[0.3em] mb-12 font-medium drop-shadow-md">
              <span>girly nuance × mood design</span>
              <span className="w-1 h-1 bg-[#c4ab93] rounded-full" />
              <span>実践で育てる、育成型ネイルサロン</span>
              <span className="hidden md:block w-1 h-1 bg-[#c4ab93] rounded-full" />
              <span>本川越駅徒歩0分</span>
            </div>

            <p className="text-white text-[13px] md:text-[1.05rem] leading-[2.6] md:leading-[2.8] max-w-2xl mx-auto font-medium drop-shadow-[0_2px_10px_rgba(27,20,15,0.7)]">
              女性らしいニュアンスデザインと、<span className="font-semibold border-b-2 border-[#c4ab93] pb-1">"持ちの良さ"</span>にこだわるサロン。<br />
              enuでは、未経験からでも「ちゃんとお客様に選ばれるネイリスト」を<br />
              焦らず、自分のペースで目指せる環境を整えています。
            </p>
          </div>

          <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-3">
            <span className="text-[#2c221a]/60 text-[9px] md:text-[10px] tracking-[0.6em] uppercase font-semibold">scroll</span>
            <div className="w-[1.5px] h-10 md:h-16 bg-gradient-to-b from-[#2c221a]/60 to-transparent" />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            2. enuについて
        ══════════════════════════════════════════ */}
        <section id="about" className="py-24 md:py-48 px-6 bg-[#eadecf] relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <Image src="/images/recruit/interior_03.jpg" alt="interior deco" fill className="object-cover" />
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-24 items-center relative z-10">
            <div className="order-2 md:order-1">
              <SectionHeading en="ABOUT US" ja="enuについて" />
              <div className="space-y-6 text-[#2c221a] text-[13px] md:text-base leading-[2.4] md:leading-[2.5] font-medium">
                <p>
                  enuは、「通いやすい価格で、毎日ちょっと気分が上がるネイルを楽しめる」そんな想いから生まれたニュアンスネイルサロンです。
                </p>
                <p>
                  <span className="font-semibold border-b border-[#a48a71]">girly nuance × mood design</span> を軸に、ちゅるん系・淡色ニュアンス・抜け感デザインなど、"女性らしい雰囲気"を大切にしたデザインをご提案しています。
                </p>
                <div className="py-5 border-y border-[#a48a71]/20 my-4">
                  <p className="text-base md:text-xl text-[#8e735b] font-semibold tracking-[0.05em] leading-relaxed italic">
                    "実践で育てる育成型サロン"
                  </p>
                  <p className="text-xs md:text-sm mt-2 md:mt-3 opacity-80 leading-relaxed">
                    誰でも最初から上手くできるわけじゃない。<br />
                    沢山向き合いながら、技術を身につけていく。そんな「成長」を大切にしています。
                  </p>
                </div>
                <p>
                  ただ可愛いだけではなく、フィルイン対応・持ちの良さ・爪への負担を考えた施術など、基礎となる技術面も妥協せず追求しているサロンです。
                </p>
              </div>
            </div>

            <div className="relative order-1 md:order-2 px-6 sm:px-4 max-w-[280px] md:max-w-none mx-auto w-full">
              <div className="absolute -inset-2 md:-inset-4 border border-[#8e735b]/30 rounded-[2rem] md:rounded-[2.5rem] translate-x-2 translate-y-2 md:translate-x-3 md:translate-y-3 pointer-events-none" />
              <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl">
                <Image
                  src="/images/recruit/interior_02.jpg"
                  alt="enu nailsalon サロン内装"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            3. enuで働く強み
        ══════════════════════════════════════════ */}
        <section className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="STRENGTHS" ja="enuで働く4つの強み" center />

            <div className="grid md:grid-cols-2 gap-x-16 gap-y-16">
              {strengthCards.map((card) => (
                <div key={card.num} className="relative group pl-2">
                  <div className="absolute -left-2 md:-left-4 -top-3 md:-top-4 text-3xl md:text-4xl font-bold text-[#8e735b]/10 tracking-tighter italic">
                    {card.num}
                  </div>
                  <h3 className="text-base md:text-xl font-semibold mb-4 md:mb-5 text-[#2c221a] tracking-wider flex items-center gap-3">
                    <span className="w-4 md:w-6 h-[1px] bg-[#8e735b]" />
                    {card.title}
                  </h3>
                  <p className="text-[#2c221a]/90 text-[13px] md:text-[0.95rem] leading-[2.2] md:leading-[2.4] font-medium pl-7 md:pl-9">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            4. ギャラリー
        ══════════════════════════════════════════ */}
        <section className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-5xl mx-auto">
            <SectionHeading en="GALLERY" ja="ネイル作品ギャラリー" center />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`relative aspect-square rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl transition-all duration-500 hover:brightness-105 ${
                    i === 6 ? "md:col-start-2" : ""
                  }`}
                >
                  <Image
                    src={`/images/recruit/nail_0${i + 1}.jpg`}
                    alt={`enuネイル作品 ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-1000 ease-out hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                </div>
              ))}
            </div>
            <div className="mt-16 md:mt-20 text-center">
              <div className="inline-block px-8 py-2 border border-[#8e735b]/30 rounded-full text-[#8e735b] text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] font-semibold">
                GIRLY NUANCE × MOOD DESIGN
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            5. 入客までのステップ
        ══════════════════════════════════════════ */}
        <section className="py-24 md:py-48 px-6 bg-[#dfd2c1] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <Image src="/images/recruit/interior_04.jpg" alt="interior deco" fill className="object-cover" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <SectionHeading en="STEPS" ja="入客までのステップ" center />

            <div className="flex overflow-x-auto pb-10 pt-4 gap-6 md:gap-8 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-x-visible md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
              {steps.map((step, i) => (
                <div 
                  key={step.num} 
                  className="min-w-[280px] md:min-w-0 snap-center relative bg-white/40 backdrop-blur-md border border-white/50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
                >
                  <div className="flex items-center justify-between mb-5 md:mb-6">
                    <span className="text-[10px] md:text-xs font-bold text-[#8e735b] tracking-widest border border-[#8e735b]/30 px-3 py-1 rounded-full bg-white/60">
                      Phase {step.num}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-[#8e735b]/80 tracking-[0.1em]">
                      {step.phase}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold text-[#2c221a] mb-4 md:mb-5 tracking-wide leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[#2c221a]/90 text-[12px] md:text-sm leading-[2.1] md:leading-[2.2] font-medium">
                    {step.body}
                  </p>
                  
                  {i < steps.length - 1 && (
                    <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-20 md:block hidden opacity-40">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e735b" strokeWidth="1.5">
                        <path d="M5 12h14M13 5l7 7-7 7"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-16 md:mt-24 bg-white/40 backdrop-blur-sm rounded-[2.5rem] md:rounded-[3rem] py-10 md:py-14 px-8 md:px-10 max-w-3xl mx-auto border border-white/60 flex flex-col sm:flex-row items-center gap-6 md:gap-8 shadow-lg">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-[#8e735b]/40 shrink-0 shadow-md">
                <Image
                  src="/images/recruit/owner_02.jpg"
                  alt="enuオーナー サポート"
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[#2c221a] text-sm md:text-lg font-semibold tracking-[0.05em] mb-2 md:mb-3">
                  マンツーマンで、あなたのペースを守り抜く。
                </p>
                <p className="text-[#8e735b] text-[11px] md:text-sm font-semibold tracking-wide leading-relaxed italic">
                  "最初から上手い人なんていない。"<br className="md:hidden" />
                  オーナーが全ての練習に付き添い、責任を持ってデビューまで導きます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            6. こんな子に来てほしい
        ══════════════════════════════════════════ */}
        <section className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="WANTED" ja="こんな子に来てほしい" center />
            
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto">
              {wantedItems.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 md:gap-6 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/30 border border-white/50 hover:bg-white/60 transition-all duration-500 group shadow-sm hover:shadow-md"
                >
                  <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#dfd2c1] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-[#8e735b]" viewBox="0 0 24 24" fill="currentColor">
                      <path d={item.iconPath} />
                    </svg>
                  </div>
                  <span className="text-[13px] md:text-[0.95rem] font-semibold tracking-wide text-[#2c221a]">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            7. 募集要項 (全体を美しく囲む1枚枠・左右2カラム化)
        ══════════════════════════════════════════ */}
        <section id="requirements" className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
          <div className="max-w-3xl mx-auto">
            <SectionHeading en="REQUIREMENTS" ja="募集要項" center />

            {/* 一つ一つバラバラに囲むのではなく、全体を一つの上品な半透明のカード枠に */}
            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 md:p-12 border border-white/60 shadow-xl divide-y divide-[#8e735b]/20">
              {jobDetails.map((row) => (
                <div key={row.label} className="grid grid-cols-[100px_1fr] md:grid-cols-[180px_1fr] gap-4 py-6 md:py-8 items-start">
                  
                  {/* 左カラム：アイコン ＋ 小見出しテキスト */}
                  <dt className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#eadecf] flex items-center justify-center text-[#8e735b] shrink-0 shadow-sm">
                      <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d={row.icon} />
                      </svg>
                    </div>
                    <span className="text-[11px] md:text-sm tracking-[0.1em] md:tracking-[0.15em] text-[#8e735b] font-bold uppercase block">
                      {row.label}
                    </span>
                  </dt>
                  
                  {/* 右カラム：具体的な内容リスト */}
                  <dd className="pl-1 md:pl-4">
                    <ul className="space-y-2">
                      {row.items.map((item, i) => (
                        <li
                          key={i}
                          className={`text-[12.5px] md:text-[0.95rem] leading-relaxed font-semibold ${
                            item.startsWith("　")
                              ? "text-[#2c221a]/70 font-medium pl-3 md:pl-4"
                              : item.startsWith("※")
                              ? "text-[#8e735b] text-[11px] md:text-xs pt-1 font-medium italic"
                              : "text-[#2c221a]"
                          }`}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>

                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════
            8. よくある質問 (Q&Aデザイン強化)
        ══════════════════════════════════════════ */}
        <section id="faq" className="py-24 md:py-48 px-6 bg-[#eadecf]">
          <div className="max-w-4xl mx-auto">
            <SectionHeading en="FAQ" ja="よくある質問" center />
            
            <div className="grid md:grid-cols-2 gap-6 md:gap-10 max-w-5xl mx-auto">
              {faqItems.map((item, index) => (
                <div key={index} className="relative bg-white/20 p-6 md:p-8 rounded-[2.5rem] border border-[#8e735b]/10 backdrop-blur-sm shadow-sm">
                  <div className="flex items-start gap-4 mb-5">
                    <span className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2c221a] text-white flex items-center justify-center font-bold italic shadow-md font-shippori">Q</span>
                    <h3 className="text-[#2c221a] text-[13.5px] md:text-[0.95rem] font-bold tracking-wide leading-relaxed pt-1.5">
                      {item.question}
                    </h3>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-[#8e735b] text-[#8e735b] flex items-center justify-center font-bold italic font-shippori">A</span>
                    <p className="text-[#2c221a]/80 text-[12.5px] md:text-[0.9rem] leading-[2.2] font-medium pt-1.5">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            9. アクセス
        ══════════════════════════════════════════ */}
        <section className="py-24 md:py-48 px-6 bg-[#dfd2c1]">
          <div className="max-w-5xl mx-auto">
            <SectionHeading en="ACCESS" ja="アクセス" center />
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <dl className="divide-y divide-[#8e735b]/30 border-y border-[#8e735b]/30">
                {[
                  { dt: "店舗名", dd: "enu" },
                  { dt: "電話番号", dd: "050-3145-1101" },
                  { dt: "住所", dd: <>〒350-0042 埼玉県川越市中原町2-25-4<br />ライラックヴィラⅠ番館302号室</> },
                  { dt: "アクセス", dd: <>西武新宿線 本川越駅　徒歩0分<br />東武東上線 川越市駅　徒歩5分</> },
                ].map(({ dt, dd }) => (
                  <div key={dt} className="flex flex-col sm:flex-row gap-1 sm:gap-12 py-5 md:py-7">
                    <dt className="text-[11px] md:text-sm tracking-[0.15em] text-[#8e735b] sm:w-24 shrink-0 font-semibold">
                      {dt}
                    </dt>
                    <dd className="text-[13px] md:text-[0.95rem] text-[#2c221a] leading-relaxed font-semibold">{dd}</dd>
                  </div>
                ))}
              </dl>

              <div className="w-full h-64 sm:h-80 md:h-auto md:aspect-square rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-[#8e735b]/30 shadow-2xl">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3233.153927649557!2d139.4800366!3d35.9126444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6018db09a2500001%3A0xc069f98f62c5e0e!2z44CSMzUwLTAwNDIg5Z-8546J55yM5bed6LaK5biC5Lit5Y6f55S677yS5LiB55uu77yS77yV4minusTvvJHvvIDjg7vjgqLjg4Pjg4bjg7vjgq_jg7vjgqvjg7vjgq_jg63jg7vjgrnjgrnjg7vjgq_jg6vjg7vjgqTjg7vjg6vjg7vjgqfjg7vjg6vjg7vjgqHjg7vjg6vjg7vjgqfvvJHvvIDvvIEh!5e0!3m2!1sja!2sjp!4v1716335123456!5m2!1sja!2sjp"
                  width="100%" height="100%" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="enu nailsalon map"
                  className="w-full h-full opacity-90 brightness-105 contrast-105"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            10. お問い合わせ
        ══════════════════════════════════════════ */}
        <footer id="contact" className="bg-[#dfd2c1] border-t border-[#8e735b]/30 text-[#2c221a] py-24 md:py-48 px-6 text-center relative overflow-hidden">
          
          <div className="max-w-3xl mx-auto relative z-10">
            <p className="text-[10px] md:text-[11px] tracking-[0.5em] text-[#8e735b] uppercase mb-5 md:mb-6 font-semibold">
              - contact -
            </p>
            <h2 className="text-xl md:text-3xl font-medium tracking-[0.15em] mb-12 md:mb-16 text-[#2c221a] font-shippori leading-relaxed">
              まずはお気軽に<br />LINEでご連絡ください
            </h2>

            <a
              href="https://lin.ee/Q8fwNYD"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 md:gap-4 bg-[#06C755] hover:bg-[#05b34c] hover:scale-105 hover:shadow-2xl text-white font-semibold text-[13px] md:text-base px-10 md:px-16 py-4 md:py-5 rounded-full transition-all duration-500 ease-out shadow-lg"
            >
              <LineIcon className="w-5 h-5 md:w-6 md:h-6" />
              LINEで応募・お問い合わせ
            </a>

            <p className="mt-6 md:mt-8 text-[11px] md:text-xs text-[#2c221a]/50 tracking-[0.2em] font-medium">
              LINE ID：@169wzdvp
            </p>

            <div className="mt-24 md:mt-32 pt-12 md:pt-16 border-t border-[#8e735b]/20 flex flex-col items-center">
              <a href="https://qrtt.jp/s/enu" className="group block relative w-40 md:w-48 h-16 md:h-20 transition-transform duration-500 hover:scale-105">
                <Image src="/images/recruit/logo.jpg" alt="enu nailsalon logo" fill className="object-contain" />
              </a>
              <a 
                href="https://qrtt.jp/s/enu"
                className="text-[10px] md:text-[11px] text-[#8e735b] tracking-[0.2em] border-b border-[#8e735b]/40 pb-1 hover:opacity-60 transition-opacity duration-300 font-semibold mt-5 md:mt-6"
              >
                enu nailsalon Official Website
              </a>
              <p className="text-[9px] md:text-[10px] text-[#2c221a]/30 tracking-widest font-light mt-10 md:mt-12">
                © enu nailsalon
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}