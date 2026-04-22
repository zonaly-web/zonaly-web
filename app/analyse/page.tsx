import { Footer } from "@/components/landing/footer";
import { Nav } from "@/components/landing/nav";
import { ResultCard } from "@/components/landing/result-card";

export default function AnalysePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav isAnalyse />
      <main className="flex flex-1 flex-col justify-center pt-24">
        <div className="w-full">
          <ResultCard />
        </div>
      </main>
      <Footer isAnalyse />
    </div>
  );
}
