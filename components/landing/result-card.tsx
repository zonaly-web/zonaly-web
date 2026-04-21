"use client";

import { motion } from "motion/react";

type BarColor = "green" | "yellow-green" | "yellow" | "orange";

type Metric = {
  label: string;
  value: string;
  valueClass?: string;
};

type Dimension = {
  name: string;
  dotColor: string;
  score: "A" | "B" | "C";
  scoreColorClass: string;
  metrics: Metric[];
  bar: { width: number; color: BarColor };
  insight: string;
};

const barColorMap: Record<BarColor, string> = {
  green: "bg-score-a",
  "yellow-green": "bg-score-b",
  yellow: "bg-score-c",
  orange: "bg-score-d",
};

const dimensions: Dimension[] = [
  {
    name: "Immobilier",
    dotColor: "var(--primary)",
    score: "A",
    scoreColorClass: "text-score-a",
    metrics: [
      { label: "Prix médian au m²", value: "9 800 €" },
      { label: "Évolution 10 ans", value: "+47%" },
      { label: "Part locataires", value: "73%" },
      { label: "Revenu médian IRIS", value: "38 400 €/an" },
    ],
    bar: { width: 92, color: "green" },
    insight:
      "Top 8% national. Marché très tendu, forte demande locative. Rendement brut estimé : 2,8–3,4%.",
  },
  {
    name: "Environnement",
    dotColor: "var(--score-c)",
    score: "C",
    scoreColorClass: "text-score-c",
    metrics: [
      { label: "Qualité de l'air (AQI)", value: "48 / 100" },
      { label: "Risque inondation", value: "Aucun" },
      { label: "Sols pollués", value: "Existant" },
      { label: "Radon", value: "Faible" },
    ],
    bar: { width: 48, color: "yellow" },
    insight:
      "55e percentile national. AQI au-dessus du seuil OMS (25). Pas de risque naturel majeur.",
  },
  {
    name: "Sécurité",
    dotColor: "var(--score-b)",
    score: "B",
    scoreColorClass: "text-score-b",
    metrics: [
      { label: "Cambriolages / 1 000 hab.", value: "8,2" },
      { label: "Agressions / 1 000 hab.", value: "3,1" },
      { label: "Quartier prioritaire", value: "Non" },
      { label: "Zone sécurité prioritaire", value: "Non" },
    ],
    bar: { width: 72, color: "yellow-green" },
    insight:
      "Top 38% des communes françaises. Taux dans la moyenne pour une grande ville touristique.",
  },
  {
    name: "Vie de quartier",
    dotColor: "var(--score-a)",
    score: "A",
    scoreColorClass: "text-score-a",
    metrics: [
      {
        label: "Transports à 500 m",
        value: "12 arrêts",
        valueClass: "text-score-a",
      },
      { label: "Commerces à 500 m", value: "34" },
      { label: "Écoles à 2 km", value: "32" },
      { label: "Permis récents", value: "32 actifs" },
    ],
    bar: { width: 95, color: "green" },
    insight:
      "Top 5% national. Accessibilité exceptionnelle. Quartier très dynamique commercialement.",
  },
];

export function ResultCard() {
  return (
    <section id="example" className="px-6 pt-10 pb-15 max-w-[1100px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden bg-bg-dark rounded-3xl p-8 md:p-[52px] shadow-[0_8px_48px_rgba(20,16,36,0.18),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
      >
        {/* Ambient blobs */}
        <div
          aria-hidden
          className="absolute -top-30 -right-30 w-[360px] h-[360px] bg-primary/[0.07] rounded-full blur-[70px] pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-20 w-[250px] h-[250px] bg-score-a/[0.04] rounded-full blur-[60px] pointer-events-none"
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start gap-7 mb-11 relative z-1">
          <div className="w-[78px] h-[78px] rounded-[20px] grid place-items-center text-[2.1rem] font-extrabold text-bg-dark bg-score-b shrink-0 shadow-[0_4px_24px_rgba(142,198,57,0.35)] tracking-[-0.02em]">
            B
          </div>
          <div className="flex-1">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/35 mb-1.5">
              Score global
            </div>
            <h2 className="text-[1.6rem] font-bold text-white mb-3.5 tracking-[-0.02em]">
              12 rue de Rivoli, Paris 75001
            </h2>
            <p className="text-[0.88rem] text-white/55 leading-[1.65]">
              Quartier globalement favorable à l&apos;investissement locatif.
              Point fort : valorisation exceptionnelle (+47% sur 10 ans) et
              accessibilité maximale. Point de vigilance : qualité de l&apos;air
              en deçà des recommandations OMS.
            </p>
            <p className="text-[0.72rem] text-white/25 mt-3">
              Analysé le 10 avril 2025 · Sources : DVF, INSEE, ATMO, SSMSI, IGN
            </p>
          </div>
        </div>

        {/* Dimensions label */}
        <div className="relative z-1 mb-6">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent-light mb-[5px]">
            Détail par thématique
          </div>
          <h3 className="text-[1.35rem] font-bold text-white tracking-[-0.02em]">
            4 dimensions analysées.
          </h3>
        </div>

        {/* Dimensions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-1">
          {dimensions.map((d, i) => (
            <div
              key={d.name}
              className="bg-white/[0.045] border border-white/[0.07] rounded-[18px] py-6 px-5 backdrop-blur-md transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.08] hover:border-white/[0.12] hover:-translate-y-[3px]"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-[0.88rem] font-semibold text-white">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: d.dotColor }}
                  />
                  {d.name}
                </div>
                <div
                  className={`text-[1.5rem] font-extrabold leading-none tracking-[-0.02em] ${d.scoreColorClass}`}
                >
                  {d.score}
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center text-[0.77rem]">
                  <span className="text-white/40">{d.metrics[0].label}</span>
                  <span
                    className={`font-semibold tabular-nums ${d.metrics[0].valueClass ?? "text-white"}`}
                  >
                    {d.metrics[0].value}
                  </span>
                </div>
                <div className="h-[3px] bg-white/[0.07] rounded-[2px] my-1 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    whileInView={{ width: `${d.bar.width}%` }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{
                      duration: 1.4,
                      delay: i * 0.15,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`h-full rounded-[2px] ${barColorMap[d.bar.color]}`}
                  />
                </div>
                {d.metrics.slice(1).map((m) => (
                  <div
                    key={m.label}
                    className="flex justify-between items-center text-[0.77rem]"
                  >
                    <span className="text-white/40">{m.label}</span>
                    <span
                      className={`font-semibold tabular-nums ${m.valueClass ?? "text-white"}`}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[0.74rem] text-white/30 leading-[1.55] mt-3.5 pt-3.5 border-t border-white/[0.05]">
                {d.insight}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
