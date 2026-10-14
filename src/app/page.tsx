import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import SpeakersSection from "@/components/sections/SpeakersSection";
import ScheduleSection from "@/components/sections/ScheduleSection";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="relative bg-black text-white selection:bg-red-600 selection:text-white">
      <HeroSection />
      <AboutSection />
      <SpeakersSection />
      <ScheduleSection />
      <Footer />
    </main>
  );
}
