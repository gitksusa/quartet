"use client";

import { useState } from "react";

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);

  // メニューの項目
  const menuItems = [
    { label: "TOP", href: "#top" },
    { label: "ABOUT (enuについて)", href: "#about" },
    { label: "STRENGTHS (4つの強み)", href: "#strengths" },
    { label: "STEPS (入客ステップ)", href: "#steps" },
    { label: "WANTED (求める人物像)", href: "#wanted" },
    { label: "REQUIREMENTS (募集要項)", href: "#requirements" },
    { label: "FAQ (よくある質問)", href: "#faq" },
  ];

  return (
    <div className="fixed bottom-6 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
      {/* メニューのポップアップ（3本線を押した時に表示） */}
      <div
        className={`transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100 pointer-events-auto translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
        } bg-white/95 backdrop-blur-md border border-[#8e735b]/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 mb-1 flex flex-col gap-1 w-56 relative z-40`}
      >
        <p className="text-[#8e735b] text-[10px] font-bold tracking-widest mb-2 px-2">MENU</p>
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className="text-[#2c221a] font-semibold text-[12px] md:text-sm tracking-wide border-b border-[#8e735b]/10 pb-2.5 pt-1.5 px-2 last:border-0 hover:text-[#8e735b] hover:bg-[#8e735b]/5 rounded-md transition-colors"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3 relative z-50">
        {/* ハンバーガーメニューボタン */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 bg-white/90 backdrop-blur-md border border-[#8e735b]/30 text-[#8e735b] rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-300 ml-auto"
        >
          <div className="flex flex-col gap-[4px] items-center justify-center w-5 h-5 relative">
            <span className={`absolute left-0 block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${isOpen ? "rotate-45 top-2" : "top-0.5"}`} />
            <span className={`absolute left-0 top-2 block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`absolute left-0 block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${isOpen ? "-rotate-45 top-2" : "top-3.5"}`} />
          </div>
        </button>

        {/* LINE問い合わせボタン */}
        <a href="#contact" className="w-14 h-14 bg-[#06C755] text-white rounded-full flex flex-col items-center justify-center shadow-xl hover:bg-[#05b34c] hover:scale-105 transition-all duration-300 group ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform group-hover:rotate-12 transition-transform">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <span className="text-[9px] font-bold tracking-tighter mt-0.5">問い合わせ</span>
        </a>
      </div>
    </div>
  );
}