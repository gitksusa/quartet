import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

export default function AccessBlock() {
  return (
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
                  <Image src="/S__4096016_0.jpg" alt="西武線" width={20} height={20} className="w-[18px] h-[18px] md:w-5 md:h-5 object-cover rounded-sm flex-shrink-0" />
                  <span><W>西武新宿線 本川越駅</W> <W>徒歩0分</W></span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/S__4096015_0.jpg" alt="東武線" width={20} height={20} className="w-[18px] h-[18px] md:w-5 md:h-5 object-cover rounded-sm flex-shrink-0" />
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
  );
}