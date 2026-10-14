"use client";
import { motion } from "framer-motion";

const speakers = [
  { name: "Sujith Vaassudev", title: "Entrepreneur & Innovator", topic: "From Concept to Reality" },
  { name: "Kaif Muhammad", title: "Technologist", topic: "Disrupting the Status Quo" },
  { name: "Aparna Premraj", title: "Creative Leader", topic: "The Art of Anomaly" },
  { name: "Ahmad Al Kaashekh", title: "Visionary Thinker", topic: "Beyond the Expected" },
  { name: "Dr. Fahed VP", title: "Researcher & Educator", topic: "Science of Change" },
  { name: "Sreeraj Gopi", title: "Social Entrepreneur", topic: "Ideas in Motion" },
];

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export default function SpeakersSection() {
  return (
    <section id="speakers" className="relative bg-black text-white min-h-screen overflow-hidden py-32">
      {/* Background large text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[clamp(8rem,20vw,18rem)] font-bold text-white/[0.02] tracking-widest">SPEAKERS</span>
      </div>

      {/* Red top accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-red-600 to-transparent origin-left"
      />

      <div className="max-w-7xl mx-auto px-8 md:px-16">
        {/* Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-red-600 text-sm tracking-[0.3em] uppercase font-semibold"
            >
              02 — Voices of &apos;25
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight mt-2"
            >
              Meet the <span className="text-red-500">Speakers</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="hidden md:block text-white/30 text-sm tracking-[0.2em] uppercase"
          >
            TEDxCUSAT 6th Edition
          </motion.div>
        </div>

        {/* Speaker Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
          {speakers.map((speaker, i) => (
            <motion.div
              key={speaker.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative bg-black p-8 flex flex-col gap-6 hover:bg-neutral-900/60 transition-colors duration-300 cursor-pointer overflow-hidden"
            >
              {/* Hover red top border */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

              {/* Avatar placeholder */}
              <div className="w-16 h-16 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center group-hover:border-red-600/50 transition-colors duration-300">
                <span className="text-white/50 text-lg font-bold group-hover:text-red-400 transition-colors duration-300">
                  {initials(speaker.name)}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold leading-tight group-hover:text-red-100 transition-colors duration-300">
                  {speaker.name}
                </h3>
                <p className="text-white/40 text-sm tracking-wide">{speaker.title}</p>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5">
                <p className="text-white/60 text-sm italic">"{speaker.topic}"</p>
              </div>

              {/* Arrow */}
              <div className="absolute bottom-8 right-8 text-white/20 group-hover:text-red-500 group-hover:translate-x-1 transition-all duration-300 text-xl">
                →
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
