import { LandingExperience } from './Components/landing/LandingExperience';
import { HeroSection } from './Components/landing/HeroSection';
import { Footer } from './Components/landing/Footer';

export default function Home() {
  return (
    <LandingExperience>
      <main className="relative z-10">
        <HeroSection />
      </main>
      <div className="relative z-10 bg-[#F3EDE4] dark:bg-[#171514] text-[#4A4238] dark:text-[#F4EDE5]">
        <Footer />
      </div>
    </LandingExperience>
  );
}
