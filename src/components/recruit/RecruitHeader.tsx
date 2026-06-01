"use client";

import { useEffect, useState } from "react";

const navItems = [
  { label: "ABOUT", href: "#about" },
  { label: "STRENGTHS", href: "#strengths" },
  { label: "STEPS", href: "#steps" },
  { label: "WANTED", href: "#wanted" },
  { label: "募集要項", href: "#requirements" },
  { label: "FAQ", href: "#faq" },
];

export default function RecruitHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* ▼ HPへのリンクに変更し、hover効果を追加しました ▼ */}
        <a 
          href="https://qrtt.jp/enu" 
          className={`font-semibold tracking-[0.2em] transition-all duration-300 flex-shrink-0 hover:opacity-70 ${isScrolled ? "text-[#2c221a]" : "text-white"} text-sm md:text-xl`}
        >
          enu
        </a>
        
        {/* スマホでもスワイプなしで全部見えるように調整 */}
        <nav className="flex items-center gap-2 sm:gap-5">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-[9px] sm:text-xs font-semibold tracking-tighter sm:tracking-widest transition-colors duration-300 hover:text-[#c4ab93] ${
                isScrolled ? "text-[#2c221a]" : "text-white/90"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}