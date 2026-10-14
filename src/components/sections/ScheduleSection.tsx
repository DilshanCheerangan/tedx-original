"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const schedule = [
  { time: "09:00 AM", title: "Registration & Welcome", desc: "Check in, network, and get settled." },
  { time: "10:00 AM", title: "Opening Ceremony", desc: "Welcome address and introduction to ANOMALY." },
  { time: "10:30 AM", title: "Talk 1 — Sujith Vaassudev", desc: "From Concept to Reality" },
  { time: "11:15 AM", title: "Talk 2 — Kaif Muhammad", desc: "Disrupting the Status Quo" },
  { time: "12:00 PM", title: "Talk 3 — Aparna Premraj", desc: "The Art of Anomaly" },
  { time: "01:00 PM", title: "Lunch Break", desc: "Break & networking session." },
  { time: "02:30 PM", title: "Talk 4 — Ahmad Al Kaashekh", desc: "Beyond the Expected" },
  { time: "03:15 PM", title: "Talk 5 — Dr. Fahed VP", desc: "Science of Change" },
  { time: "04:00 PM", title: "Talk 6 — Sreeraj Gopi", desc: "Ideas in Motion" },
  { time: "05:00 PM", title: "Closing Ceremony", desc: "Reflections and closing remarks." },
  { time: "06:00 PM", title: "Networking & End", desc: "Athulya Hall, Infopark Kochi." },
];

export default function ScheduleSection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(lineRef, { once: true, margin: "-100px" });

  return (
    <section id="schedule" className="relative bg-[#0a0a0a] text-white min-h-screen overflow-hidden py-32">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none select-none overflow-hidden">
        <span className="text-[clamp(4rem,12vw,10rem)] font-bold text-white/[0.02] tracking-widest rotate-90 origin-right">JAN 31</span>
      </div>

      <div className="max-w-7xl mx-auto px-8 md:px-16">
        {/* Header */}
        <div className="mb-20">
          <motion.span
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-red-600 text-sm tracking-[0.3em] uppercase font-semibold"
          >
            03 — Event Day
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight mt-2"
          >
            Schedule — <span className="text-red-500">Jan 31</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-white/40 mt-3 text-sm tracking-[0.2em] uppercase"
          >
            Athulya Hall, Infopark Kochi · 09:00 – 18:00 IST
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="relative flex gap-12">
          {/* Vertical line */}
          <div ref={lineRef} className="relative flex-shrink-0 flex flex-col items-center">
            <div className="w-[2px] bg-white/10 absolute top-0 bottom-0 left-1/2 -translate-x-1/2" />
            <motion.div
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 2.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="w-[2px] bg-gradient-to-b from-red-600 via-red-400 to-red-600/20 absolute top-0 left-1/2 -translate-x-1/2 origin-top"
              style={{ height: "100%" }}
            />
          </div>

          {/* Events */}
          <div className="flex flex-col gap-0 w-full">
            {schedule.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative flex gap-8 items-start py-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors pl-2 pr-4"
              >
                {/* Dot on line */}
                <div className="absolute -left-[29px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neutral-800 border-2 border-white/20 group-hover:border-red-500 group-hover:bg-red-900 transition-colors duration-300 z-10" />

                <div className="w-28 flex-shrink-0">
                  <span className="text-red-500/70 text-sm font-mono tracking-wider group-hover:text-red-400 transition-colors">{item.time}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base md:text-lg text-white/90 group-hover:text-white transition-colors">{item.title}</h3>
                  <p className="text-white/40 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
