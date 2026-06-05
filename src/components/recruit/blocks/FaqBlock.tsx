import SectionHeading from "@/components/recruit/shared/SectionHeading";
import ScrollReveal from "@/components/recruit/ScrollReveal";
import FaqAccordion from "@/components/recruit/FaqAccordion";

export default function FaqBlock() {
  return (
    <section id="faq" className="py-24 md:py-48 px-6 bg-[#eadecf]">
      <div className="max-w-4xl mx-auto">
        <SectionHeading en="FAQ" ja="よくある質問" center />
        <ScrollReveal animation="fade-up" className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-[2.5rem] p-6 md:p-12 shadow-sm max-w-3xl mx-auto">
          <FaqAccordion />
        </ScrollReveal>
      </div>
    </section>
  );
}