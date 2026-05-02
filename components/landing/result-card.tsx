"use client";

import { useCeremaPrix } from "@/lib/cerema/use-cerema";
import { useGeorisques } from "@/lib/georisques/use-georisque";
import { useInseeCommune } from "@/lib/insee/use-insee";
import { useQpv } from "@/lib/qpv/use-qpv";
import { useQrr } from "@/lib/qrr/use-qrr";
import { useSsmsi } from "@/lib/ssmsi/use-ssmsi";
import { useAtmo } from "@/lib/atmo/use-atmo";
import { useOverpass } from "@/lib/overpass/use-overpass";
import { useSitadel } from "@/lib/sitadel/use-sitadel";
import { aggregateDimension, aggregateGlobal } from "@/lib/scoring/aggregate";
import { gradeColor, scoreToGrade, type BarColor } from "@/lib/scoring/grade";
import type { Grade } from "@/lib/scoring/types";
import { motion } from "motion/react";
import { useMemo, type ReactNode } from "react";

type Metric = {
  label: string;
  value: ReactNode;
  valueClass?: string;
};

type Dimension = {
  name: string;
  dotColor: string;
  score: number | null;
  grade: Grade | null;
  scoreColorClass: string;
  metrics: Metric[];
  bar: { width: number; color: BarColor };
  isLoading: boolean;
  insight?: string;
};

type MetricValueProps = {
  kind: "price" | "evolution" | "percent" | "eurYear" | "permille" | "qpvCount" | "other";
  value: number | null | undefined;
  isLoading: boolean;
  isError: boolean;
};

const barColorMap: Record<BarColor, string> = {
  green: "bg-score-a",
  "yellow-green": "bg-score-b",
  yellow: "bg-score-c",
  orange: "bg-score-d",
  red: "bg-score-e",
};

const gradeTextColorMap: Record<Grade, string> = {
  A: "text-score-a",
  B: "text-score-b",
  C: "text-score-c",
  D: "text-score-d",
  E: "text-score-e",
};

const gradeBgMap: Record<Grade, string> = {
  A: "bg-score-a shadow-[0_4px_24px_rgba(29,185,84,0.35)]",
  B: "bg-score-b shadow-[0_4px_24px_rgba(142,198,57,0.35)]",
  C: "bg-score-c shadow-[0_4px_24px_rgba(230,168,23,0.35)]",
  D: "bg-score-d shadow-[0_4px_24px_rgba(232,117,32,0.35)]",
  E: "bg-score-e shadow-[0_4px_24px_rgba(224,64,64,0.35)]",
};

const dotColorByGrade: Record<Grade, string> = {
  A: "var(--score-a)",
  B: "var(--score-b)",
  C: "var(--score-c)",
  D: "var(--score-d)",
  E: "var(--score-e)",
};

const eurFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const shareFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const permilleFmt = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function EnvMetricValue({
  value,
  isLoading,
  isError,
}: {
  value: string | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <span
        aria-hidden
        className="inline-block h-4 w-14 animate-pulse rounded bg-white/10 align-middle"
      />
    );
  }
  if (isError || !value) return <span>—</span>;
  return <span>{value}</span>;
}

function AtmoMetricValue({
  libQual,
  coulQual,
  isLoading,
  isError,
}: {
  libQual: string | null | undefined;
  coulQual: string | null | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <span
        aria-hidden
        className="inline-block h-4 w-14 animate-pulse rounded bg-white/10 align-middle"
      />
    );
  }
  if (isError || !libQual) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {coulQual ? (
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: coulQual }}
        />
      ) : null}
      <span>{libQual}</span>
    </span>
  );
}

function MetricValue({ kind, value, isLoading, isError }: MetricValueProps) {
  if (isLoading) {
    const widthClass = kind === "price" || kind === "eurYear" ? "w-16" : "w-12";
    return (
      <span
        aria-hidden
        className={`inline-block h-4 animate-pulse rounded bg-white/10 align-middle ${widthClass}`}
      />
    );
  }
  if (isError || value == null) {
    return <span>N/A</span>;
  }
  switch (kind) {
    case "price":
      return <span>{`${eurFmt.format(value)} €`}</span>;
    case "evolution":
      return <span>{pctFmt.format(value)}</span>;
    case "percent":
      return <span>{`${shareFmt.format(value)} %`}</span>;
    case "eurYear":
      return <span>{`${eurFmt.format(value)} €/an`}</span>;
    case "permille":
      return <span>{permilleFmt.format(value)}</span>;
    default:
      return <span>{`${value}`}</span>;
  }
}

function buildDimension(
  name: string,
  score: number | null,
  metrics: Metric[],
  isLoading: boolean,
  insight?: string,
): Dimension {
  const grade = isLoading ? null : scoreToGrade(score);
  const color = gradeColor(grade);
  return {
    name,
    score: isLoading ? null : score,
    grade,
    dotColor: grade ? dotColorByGrade[grade] : "var(--score-c)",
    scoreColorClass: grade ? gradeTextColorMap[grade] : "text-white/40",
    metrics,
    bar: { width: isLoading ? 0 : (score ?? 0), color },
    isLoading,
    insight,
  };
}

export function ResultCard({
  address,
  citycode,
}: {
  address?: string;
  citycode?: string;
} = {}) {
  const cerema = useCeremaPrix(citycode);
  const insee = useInseeCommune(citycode);
  const georisques = useGeorisques(citycode);
  const ssmsi = useSsmsi(citycode);
  const qpv = useQpv(citycode);
  const qrr = useQrr(citycode);
  const atmo = useAtmo(citycode);
  const overpass = useOverpass(citycode);
  const sitadel = useSitadel(citycode);
  const enabled = !!citycode;

  const immoLoading = enabled && (cerema.isLoading || insee.isLoading);
  const envLoading = enabled && (atmo.isLoading || georisques.isLoading);
  const secuLoading = enabled && (ssmsi.isLoading || qpv.isLoading || qrr.isLoading);
  const globalLoading = immoLoading || envLoading || secuLoading;

  const immoScore = useMemo(
    () =>
      enabled
        ? aggregateDimension([
            { score: cerema.data?.evolution5YScore ?? null, weight: 35 },
            { score: insee.data?.partProprietairesScore ?? null, weight: 25 },
            { score: insee.data?.revenuMedianScore ?? null, weight: 25 },
            { score: cerema.data?.prixMedianM2Score ?? null, weight: 15 },
          ])
        : 92,
    [enabled, cerema.data, insee.data],
  );

  const envScore = useMemo(
    () =>
      enabled
        ? aggregateDimension([
            { score: atmo.data?.atmoScore ?? null, weight: 35 },
            { score: georisques.data?.radonScore ?? null, weight: 25 },
            { score: georisques.data?.sitesPolluesScore ?? null, weight: 20 },
            { score: georisques.data?.argileScore ?? null, weight: 20 },
          ])
        : 48,
    [enabled, atmo.data, georisques.data],
  );

  const secuScore = useMemo(
    () =>
      enabled
        ? aggregateDimension([
            { score: ssmsi.data?.cambriolagesScore ?? null, weight: 40 },
            { score: ssmsi.data?.agressionsScore ?? null, weight: 40 },
            { score: qpv.data?.score ?? null, weight: 10 },
            { score: qrr.data?.score ?? null, weight: 10 },
          ])
        : 72,
    [enabled, ssmsi.data, qpv.data, qrr.data],
  );

  const globalScore = useMemo(
    () => aggregateGlobal([immoScore, envScore, secuScore]),
    [immoScore, envScore, secuScore],
  );
  const globalGrade = globalLoading ? null : scoreToGrade(globalScore);

  const dimensions: Dimension[] = [
    buildDimension(
      "Immobilier",
      immoScore,
      [
        {
          label: "Prix médian au m²",
          value: enabled ? (
            <MetricValue
              kind="price"
              value={cerema.data?.prixMedianM2}
              isLoading={cerema.isLoading}
              isError={cerema.isError}
            />
          ) : (
            "9 800 €"
          ),
        },
        {
          label: "Évolution 5 ans",
          value: enabled ? (
            <MetricValue
              kind="evolution"
              value={cerema.data?.evolution5Y}
              isLoading={cerema.isLoading}
              isError={cerema.isError}
            />
          ) : (
            "+47%"
          ),
        },
        {
          label: "Part propriétaires",
          value: enabled ? (
            <MetricValue
              kind="percent"
              value={insee.data?.partProprietaires}
              isLoading={insee.isLoading}
              isError={insee.isError}
            />
          ) : (
            "27%"
          ),
        },
        {
          label: "Revenu médian",
          value: enabled ? (
            <MetricValue
              kind="eurYear"
              value={insee.data?.revenuMedianEurYr}
              isLoading={insee.isLoading}
              isError={insee.isError}
            />
          ) : (
            "38 400 €/an"
          ),
        },
      ],
      immoLoading,
      enabled
        ? undefined
        : "Top 8% national. Marché très tendu, forte demande locative. Rendement brut estimé : 2,8–3,4%.",
    ),
    buildDimension(
      "Environnement",
      envScore,
      [
        {
          label: "Qualité de l'air",
          value: enabled ? (
            <AtmoMetricValue
              libQual={atmo.data?.libQual}
              coulQual={atmo.data?.coulQual}
              isLoading={atmo.isLoading}
              isError={atmo.isError}
            />
          ) : (
            "Moyen"
          ),
        },
        {
          label: "Argile (RGA)",
          value: enabled ? (
            <EnvMetricValue
              value={georisques.data?.argile}
              isLoading={georisques.isLoading}
              isError={georisques.isError}
            />
          ) : (
            "Faible"
          ),
        },
        {
          label: "Sites pollués (commune)",
          value: enabled ? (
            <EnvMetricValue
              value={
                georisques.data?.sitesPolluesCount != null
                  ? `${eurFmt.format(georisques.data.sitesPolluesCount)} sites`
                  : undefined
              }
              isLoading={georisques.isLoading}
              isError={georisques.isError}
            />
          ) : (
            "—"
          ),
        },
        {
          label: "Radon",
          value: enabled ? (
            <EnvMetricValue
              value={georisques.data?.radon}
              isLoading={georisques.isLoading}
              isError={georisques.isError}
            />
          ) : (
            "Faible"
          ),
        },
      ],
      envLoading,
      enabled
        ? undefined
        : "55e percentile national. AQI au-dessus du seuil OMS (25). Pas de risque naturel majeur.",
    ),
    buildDimension(
      "Sécurité",
      secuScore,
      [
        {
          label: "Cambriolages / 1 000 log.",
          value: enabled ? (
            <MetricValue
              kind="permille"
              value={ssmsi.data?.cambriolagesPer1000Logements}
              isLoading={ssmsi.isLoading}
              isError={ssmsi.isError}
            />
          ) : (
            "8,2"
          ),
        },
        {
          label: "Agressions / 1 000 hab.",
          value: enabled ? (
            <MetricValue
              kind="permille"
              value={ssmsi.data?.agressionsPer1000Habitants}
              isLoading={ssmsi.isLoading}
              isError={ssmsi.isError}
            />
          ) : (
            "3,1"
          ),
        },
        {
          label: qpv.data && qpv.data.count > 1 ? "Quartiers prioritaires" : "Quartier prioritaire",
          value: enabled ? (
            <MetricValue
              kind="other"
              value={qpv.data?.count}
              isLoading={qpv.isLoading}
              isError={qpv.isError}
            />
          ) : (
            "2"
          ),
        },
        {
          label:
            qrr.data && qrr.data.count > 1
              ? "Zones sécurité prioritaires"
              : "Zone sécurité prioritaire",
          value: enabled ? (
            <MetricValue
              kind="other"
              value={qrr.data?.count}
              isLoading={qrr.isLoading}
              isError={qrr.isError}
            />
          ) : (
            "1"
          ),
        },
      ],
      secuLoading,
      enabled
        ? undefined
        : "Top 38% des communes françaises. Taux dans la moyenne pour une grande ville touristique.",
    ),
    // Vie de quartier : affichée mais non scorée pour une vraie analyse (exclue du global).
    // En mode landing (démo), un score est affiché et l'insight est inclus.
    buildDimension(
      "Vie de quartier",
      enabled ? null : 95,
      [
        {
          label: "Transports",
          value: enabled ? (
            <EnvMetricValue
              value={
                overpass.data?.transports != null
                  ? `${eurFmt.format(overpass.data.transports)} lignes`
                  : undefined
              }
              isLoading={overpass.isLoading}
              isError={overpass.isError}
            />
          ) : (
            "12 lignes"
          ),
        },
        {
          label: "Commerces",
          value: enabled ? (
            <EnvMetricValue
              value={
                overpass.data?.commerces != null
                  ? eurFmt.format(overpass.data.commerces)
                  : undefined
              }
              isLoading={overpass.isLoading}
              isError={overpass.isError}
            />
          ) : (
            "34"
          ),
        },
        {
          label: "Écoles",
          value: enabled ? (
            <EnvMetricValue
              value={
                overpass.data?.ecoles != null ? eurFmt.format(overpass.data.ecoles) : undefined
              }
              isLoading={overpass.isLoading}
              isError={overpass.isError}
            />
          ) : (
            "32"
          ),
        },
        {
          label: "Permis récents",
          value: enabled ? (
            <EnvMetricValue
              value={
                sitadel.data?.logementsAutorises != null
                  ? `${eurFmt.format(sitadel.data.permitsCount)} permis · ${eurFmt.format(sitadel.data.logementsAutorises)} logements`
                  : undefined
              }
              isLoading={sitadel.isLoading}
              isError={sitadel.isError}
            />
          ) : (
            "12 permis · 250 logements"
          ),
        },
      ],
      false,
      enabled
        ? undefined
        : "Top 5% national. Accessibilité exceptionnelle. Quartier très dynamique commercialement.",
    ),
  ];

  const headerGrade: Grade | null = globalGrade ?? (enabled ? null : "B");
  const headerBgClass = headerGrade ? gradeBgMap[headerGrade] : "bg-white/5";

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
          <div
            className={`text-bg-dark grid h-[78px] w-[78px] shrink-0 place-items-center rounded-[20px] text-[2.1rem] font-extrabold tracking-[-0.02em] ${headerBgClass} ${globalLoading ? "animate-pulse text-white/30" : ""}`}
          >
            {globalLoading ? "" : (globalGrade ?? (enabled ? "—" : "B"))}
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-[0.7rem] font-semibold tracking-[0.1em] text-white/35 uppercase">
              Score global
            </div>
            <h2 className="mb-3.5 text-[1.6rem] font-bold tracking-[-0.02em] text-white">
              {address ?? "12 rue de Rivoli, Paris 75001"}
            </h2>
            {!enabled ? (
              <p className="text-[0.88rem] leading-[1.65] text-white/55">
                Quartier globalement favorable à l&apos;investissement locatif. Point fort :
                valorisation exceptionnelle (+47% sur 10 ans) et accessibilité maximale. Point de
                vigilance : qualité de l&apos;air en deçà des recommandations OMS.
              </p>
            ) : null}
            <p className="mt-3 text-[0.72rem] text-white/25">
              {!enabled ? "Analysé le 10 avril 2025 · " : ""}Sources : DVF, INSEE, ATMO, SSMSI,
              Géorisques
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
                  {d.grade ?? "—"}
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

              {d.insight ? (
                <p className="mt-3.5 border-t border-white/[0.05] pt-3.5 text-[0.74rem] leading-[1.55] text-white/30">
                  {d.insight}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
