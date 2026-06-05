import React from "react";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import SectionHeading from "@/components/recruit/shared/SectionHeading";

type JobDetail = {
  label: string;
  items: React.ReactNode[];
  icon: string;
};

type Props = {
  details: JobDetail[];
};

export default function RequirementsBlock({ details }: Props) {
  return (
    <section id="requirements" className="py-24 md:py-48 px-4 sm:px-6 bg-[#dfd2c1]">
      <div className="max-w-3xl mx-auto">
        <SectionHeading en="REQUIREMENTS" ja="募集要項" center />
        <ScrollReveal animation="fade-up" className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-8 md:p-12 border border-white/60 shadow-xl divide-y divide-[#8e735b]/20">
          {details.map((row) => (
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
  );
}