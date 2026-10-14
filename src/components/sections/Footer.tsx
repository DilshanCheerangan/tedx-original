"use client";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer id="contact" className="relative bg-black text-white border-t border-white/10 overflow-hidden">
      {/* Large background text */}
      <div className="absolute inset-0 flex items-end pointer-events-none select-none overflow-hidden pb-0">
        <span className="text-[clamp(5rem,15vw,14rem)] font-bold text-white/[0.025] tracking-tighter leading-none w-full text-center">
          TEDxCUSAT
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-8 md:px-16 py-24 relative z-10">
        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 pb-16 border-b border-white/10">
          {/* Branding */}
          <div className="flex flex-col gap-6">
            <div className="text-3xl font-bold tracking-tighter">
              <span className="text-red-600">TEDx</span><span>CUSAT</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              An independently organized TED event at Cochin University of Science And Technology.
            </p>
            {/* Social */}
            <div className="flex gap-4">
              {["Instagram", "Twitter", "Facebook"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-white/40 text-xs tracking-[0.2em] uppercase hover:text-red-500 transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Venue */}
          <div className="flex flex-col gap-4">
            <h4 className="text-red-600 text-xs tracking-[0.3em] uppercase font-semibold mb-2">Venue</h4>
            <p className="text-white/70 text-sm leading-relaxed">
              Athulya Hall<br />
              Infopark Campus, Kakkanad<br />
              Kochi, Kerala — 682042
            </p>
            <p className="text-white/40 text-sm">Jan 31, 2026 · 09:00 – 18:00 IST</p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-red-600 text-xs tracking-[0.3em] uppercase font-semibold mb-2">Quick Links</h4>
            {["About", "Speakers", "Schedule", "Book Tickets", "Buy Merch"].map((link) => (
              <a key={link} href="#" className="text-white/50 text-sm hover:text-white transition-colors flex items-center gap-2 group">
                <span className="w-0 h-[1px] bg-red-500 group-hover:w-4 transition-all duration-300"></span>
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/20 text-xs tracking-[0.2em]"
          >
            © 2026 TEDxCUSAT. All rights reserved. This is an independently organized TED event.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/20 text-xs tracking-[0.2em]"
          >
            ANOMALY · 6TH EDITION
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
