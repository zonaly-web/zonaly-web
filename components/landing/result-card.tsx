"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useCeremaPrix } from "@/hooks/use-cerema-prix";

type BarColor = "green" | "yellow-green" | "yellow" | "orange";

type Metric = {
  label: string;
  value: ReactNode;
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

type MetricValueProps = {
  kind: "price" | "evolution";
  value: number | null | undefined;
  isLoading: boolean;
  isError: boolean;
};

const barColorMap: Record<BarColor, string> = {
  green: "bg-score-a",
  "yellow-green": "bg-score-b",
  yellow: "bg-score-c",
  orange: "bg-score-d",
};

const eurFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function MetricValue({ kind, value, isLoading, isError }: MetricValueProps) {
  if (isLoading) {
    return (
      <span
        aria-hidden
        className={`inline-block animate-pulse rounded bg-white/10 align-middle ${
          kind === "price" ? "h-4 w-16" : "h-4 w-12"
        }`}
      />
    );
  }
  if (isError || !value) {
    return <span>N/A</span>;
  }
  return <span>{kind === "price" ? `${eurFmt.format(value)} €` : pctFmt.format(value)}</span>;
}

export function ResultCard({ address, citycode }: { address?: string; citycode?: string } = {}) {
  const { data, isLoading, isError } = useCeremaPrix(citycode);

  const immobilierMetrics: Metric[] = !citycode
    ? [
        { label: "Prix médian au m²", value: "9 800 €" },
        { label: "Évolution 10 ans", value: "+47%" },
        { label: "Part locataires", value: "73%" },
        { label: "Revenu médian IRIS", value: "38 400 €/an" },
      ]
    : [
        {
          label: "Prix médian au m²",
          value: (
            <MetricValue
              kind="price"
              value={data?.prixMedianM2}
              isLoading={isLoading}
              isError={isError}
            />
          ),
        },
        {
          label: "Évolution 5 ans",
          value: (
            <MetricValue
              kind="evolution"
              value={data?.evolution5Y}
              isLoading={isLoading}
              isError={isError}
            />
          ),
        },
        { label: "Part locataires", value: "73%" },
        { label: "Revenu médian IRIS", value: "38 400 €/an" },
      ];

  const dimensions: Dimension[] = [
    {
      name: "Immobilier",
      dotColor: "var(--primary)",
      score: "A",
      scoreColorClass: "text-score-a",
      metrics: immobilierMetrics,
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

  return (
    <section id="example" className="mx-auto max-w-[1100px] px-6 pt-10 pb-15">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="bg-bg-dark relative overflow-hidden rounded-3xl p-8 shadow-[0_8px_48px_rgba(20,16,36,0.18),0_0_0_1px_rgba(255,255,255,0.03)_inset] md:p-[52px]"
      >
        {/* Ambient blobs */}
        <div
          aria-hidden
          className="bg-primary/[0.07] pointer-events-none absolute -top-30 -right-30 h-[360px] w-[360px] rounded-full blur-[70px]"
        />
        <div
          aria-hidden
          className="bg-score-a/[0.04] pointer-events-none absolute -bottom-20 -left-20 h-[250px] w-[250px] rounded-full blur-[60px]"
        />

        {/* Header */}
        <div className="relative z-1 mb-11 flex flex-col items-start gap-7 sm:flex-row">
          <div className="text-bg-dark bg-score-b grid h-[78px] w-[78px] shrink-0 place-items-center rounded-[20px] text-[2.1rem] font-extrabold tracking-[-0.02em] shadow-[0_4px_24px_rgba(142,198,57,0.35)]">
            B
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-[0.7rem] font-semibold tracking-[0.1em] text-white/35 uppercase">
              Score global
            </div>
            <h2 className="mb-3.5 text-[1.6rem] font-bold tracking-[-0.02em] text-white">
              {address ?? "12 rue de Rivoli, Paris 75001"}
            </h2>
            <p className="text-[0.88rem] leading-[1.65] text-white/55">
              Quartier globalement favorable à l&apos;investissement locatif. Point fort :
              valorisation exceptionnelle (+47% sur 10 ans) et accessibilité maximale. Point de
              vigilance : qualité de l&apos;air en deçà des recommandations OMS.
            </p>
            <p className="mt-3 text-[0.72rem] text-white/25">
              Analysé le 10 avril 2025 · Sources : DVF, INSEE, ATMO, SSMSI, IGN
            </p>
          </div>
        </div>

        {/* Dimensions label */}
        <div className="relative z-1 mb-6">
          <div className="text-accent-light mb-[5px] text-[0.7rem] font-semibold tracking-[0.1em] uppercase">
            Détail par thématique
          </div>
          <h3 className="text-[1.35rem] font-bold tracking-[-0.02em] text-white">
            4 dimensions analysées.
          </h3>
        </div>

        {/* Dimensions grid */}
        <div className="relative z-1 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {dimensions.map((d, i) => (
            <div
              key={d.name}
              className="rounded-[18px] border border-white/[0.07] bg-white/[0.045] px-5 py-6 backdrop-blur-md transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:border-white/[0.12] hover:bg-white/[0.08]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[0.88rem] font-semibold text-white">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.dotColor }} />
                  {d.name}
                </div>
                <div
                  className={`text-[1.5rem] leading-none font-extrabold tracking-[-0.02em] ${d.scoreColorClass}`}
                >
                  {d.score}
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[0.77rem]">
                  <span className="text-white/40">{d.metrics[0].label}</span>
                  <span
                    className={`font-semibold tabular-nums ${d.metrics[0].valueClass ?? "text-white"}`}
                  >
                    {d.metrics[0].value}
                  </span>
                </div>
                <div className="my-1 h-[3px] overflow-hidden rounded-[2px] bg-white/[0.07]">
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
                  <div key={m.label} className="flex items-center justify-between text-[0.77rem]">
                    <span className="text-white/40">{m.label}</span>
                    <span className={`font-semibold tabular-nums ${m.valueClass ?? "text-white"}`}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3.5 border-t border-white/[0.05] pt-3.5 text-[0.74rem] leading-[1.55] text-white/30">
                {d.insight}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
