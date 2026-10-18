import HeroSection from "@/components/sections/HeroSection";

export default function Home() {
  return (
    <main className="relative bg-black text-white selection:bg-red-600 selection:text-white overflow-hidden">
      <HeroSection />
    </main>
  );
}
