import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ResultCard } from "@/components/landing/result-card";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <ResultCard />
      <CtaSection />
      <Footer />
    </>
  );
}
