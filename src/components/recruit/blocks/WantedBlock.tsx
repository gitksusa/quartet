import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

type WantedItem = {
  iconPath: string;
  text: string;
};

type Props = {
  items: WantedItem[];
};

export default function WantedBlock({ items }: Props) {
  return (
    <section id="wanted" className="py-24 md:py-48 px-6 bg-[#eadecf]">
      <div className="max-w-4xl mx-auto">
        <SectionHeading en="WANTED" ja="こんな子に来てほしい" center />
        
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto mb-20 md:mb-32">
          {items.map((item, i) => (
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
  );
}