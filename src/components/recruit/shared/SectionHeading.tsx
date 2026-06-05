import Image from "next/image";
import ScrollReveal from "@/components/recruit/ScrollReveal";

type Props = {
  en: string;
  ja: string;
  center?: boolean;
};

export default function SectionHeading({ en, ja, center = false }: Props) {
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