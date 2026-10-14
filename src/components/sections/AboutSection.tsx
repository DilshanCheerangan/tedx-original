"use client";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function AboutSection() {
  return (
    <section id="about" className="relative bg-[#0a0a0a] text-white min-h-screen flex flex-col justify-center overflow-hidden border-t border-white/5">
      {/* Red accent top line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent origin-left"
      />

      <div className="max-w-7xl mx-auto px-16 py-32 w-full grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-24 items-start">
        {/* Section number */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col gap-4"
        >
          <span className="text-red-600 text-[clamp(5rem,10vw,9rem)] font-bold leading-none tracking-tighter opacity-20 select-none">01</span>
          <div className="w-[1px] h-24 bg-gradient-to-b from-red-600 to-transparent ml-6"></div>
        </motion.div>

        {/* Content */}
        <div className="flex flex-col gap-16">
          {/* Headline */}
          <div className="overflow-hidden">
            <motion.h2
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-[clamp(3rem,6vw,5rem)] font-bold leading-tight tracking-tight"
            >
              About <span className="text-red-500">ANOMALY</span>
            </motion.h2>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="flex flex-col gap-6"
            >
              <p className="text-white/60 text-lg leading-relaxed font-light">
                TEDxCUSAT is a dynamic platform where the brightest minds of Cochin University of Science And Technology come together to share ideas that have the power to inspire meaningful change.
              </p>
              <p className="text-white/60 text-lg leading-relaxed font-light">
                Now in its <span className="text-white">6th edition</span>, TEDxCUSAT presents <span className="text-red-400 font-medium">ANOMALY</span> — a celebration of ideas, individuals, and innovations that defy the expected and redefine what's possible.
              </p>
            </motion.div>

            {/* Quote block */}
            <motion.div
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="border-l-2 border-red-600 pl-8 flex flex-col justify-center gap-4"
            >
              <p className="text-2xl md:text-3xl font-light italic text-white/80 leading-snug">
                "Ideas that disrupt the ordinary."
              </p>
              <span className="text-red-500 text-sm tracking-[0.25em] uppercase font-semibold">TEDxCUSAT 2026</span>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            custom={4}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="grid grid-cols-3 gap-0 border border-white/10 divide-x divide-white/10"
          >
            {[
              { val: "6th", label: "Edition" },
              { val: "6", label: "Speakers" },
              { val: "Jan 31", label: "2026" },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center justify-center py-8 gap-1 hover:bg-white/5 transition">
                <span className="text-3xl md:text-4xl font-bold text-white">{val}</span>
                <span className="text-white/40 text-xs tracking-[0.25em] uppercase">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
