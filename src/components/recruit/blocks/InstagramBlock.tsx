'use client';
import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";
import { track } from "@vercel/analytics";

const W = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block">{children}</span>
);

export default function InstagramBlock() {
  return (
    <section className="py-24 md:py-48 px-6 bg-[#eadecf]">
      <div className="max-w-4xl mx-auto text-center">
        <SectionHeading en="INSTAGRAM" ja="公式Instagram" center />
        <ScrollReveal animation="fade-up">
          <p className="text-[#2c221a] text-sm md:text-base leading-[2.2] mb-10 max-w-xl mx-auto font-medium">
            <W>enuの最新ニュアンスデザインや</W><W>サロンの雰囲気を</W><W>公式Instagramにて発信しています。</W><W>ぜひ世界観をチェックしてみてください。</W>
          </p>
          <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-[2.5rem] p-6 md:p-12 max-w-2xl mx-auto shadow-sm">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-5 h-5 text-[#8e735b]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
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
            <a href="https://www.instagram.com/enu_kawagoe/" target="_blank" rel="noopener noreferrer" onClick={() => track('click_instagram_button', { page: 'recruit' })}  className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#b09880] to-[#8e735b] text-white font-semibold text-sm px-10 py-4 rounded-full shadow-md hover:scale-105 transition-transform duration-300 w-full">
              Instagramを見る
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}