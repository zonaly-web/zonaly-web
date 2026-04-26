import { redirect } from "next/navigation";
import { Footer } from "@/components/landing/footer";
import { Nav } from "@/components/landing/nav";
import { ResultCard } from "@/components/landing/result-card";

export default async function AnalysePage({ searchParams }: PageProps<"/analyse">) {
  const sp = await searchParams;
  const citycode = typeof sp.citycode === "string" ? sp.citycode : null;
  const label = typeof sp.label === "string" ? sp.label : null;
  if (!citycode || !label || !/^\d{5}[AB]?$/.test(citycode)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav isAnalyse />
      <main className="flex flex-1 flex-col justify-center pt-24">
        <div className="w-full">
          <ResultCard address={label} citycode={citycode} />
        </div>
      </main>
      <Footer isAnalyse />
    </div>
  );
}
