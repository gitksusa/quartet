"use client";

import { useEffect, useState } from "react";

export default function RecruitHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-[#eadecf]/95 backdrop-blur-xl border-b-2 border-[#8e735b]/20 shadow-xl h-16 md:h-18"
          : "bg-transparent h-24 md:h-28"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 h-full flex items-center justify-between gap-3 md:gap-8">
        
        {/* 左側：enuロゴ */}
        <div
          className={`flex items-baseline gap-5 md:gap-8 shrink-0 transition-colors duration-700 ${
            scrolled ? "text-[#2c221a]" : "text-white drop-shadow-md"
          }`}
        >
          <a
            href="https://qrtt.jp/s/enu"
            className="text-xl md:text-[2rem] tracking-[0.25em] font-bold font-sans hover:opacity-70 transition-opacity"
            style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}
          >
            enu
          </a>
          <span className="hidden sm:inline text-[11px] md:text-xs opacity-60 tracking-[0.4em] font-light font-shippori select-none pt-1">
            — recruitment —
          </span>
        </div>

        {/* 右側：ナビゲーションメニュー */}
        <nav 
          className="flex items-center gap-5 sm:gap-8 md:gap-14 text-[10px] md:text-[0.85rem] tracking-[0.2em] md:tracking-[0.3em] font-bold overflow-x-auto whitespace-nowrap px-2 scrollbar-hide h-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
          
          {[
            { id: "top", name: "TOP" },
            { id: "about", name: "ABOUT" },
            { id: "requirements", name: "RECRUIT" },
            { id: "faq", name: "FAQ" },
            { id: "contact", name: "CONTACT" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleScroll(e, item.id)}
              className={`group relative py-3 md:py-4 transition-all duration-300 ${
                scrolled ? "text-[#2c221a]" : "text-white opacity-95"
              }`}
            >
              {item.name}
              <span className="absolute bottom-1.5 md:bottom-2 left-0 w-0 h-[2px] bg-[#8e735b] transition-all duration-500 group-hover:w-full" />
            </a>
          ))}
        </nav>

      </div>
    </header>
  );
}