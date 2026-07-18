"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { EmptyState, Money, SectionHeader, SkeletonPanel } from "@/components/pixel/atoms";
import { groupByMonth } from "@/lib/releases";
import { useReleases } from "@/lib/use-releases";
import { useSavingFor } from "@/lib/use-saving-for";
import type { AnticipationTier, UpcomingRelease } from "@/types/pokehub";

// ssr:false keeps `three` (the WebGL engine) out of the initial/server bundle.
const ReleaseConstellation = dynamic(
  () => import("@/components/dashboard/ReleaseConstellation").then((mod) => mod.ReleaseConstellation),
  { ssr: false, loading: () => <SkeletonPanel lines={6} /> }
);

const TIER_CLASS: Record<AnticipationTier, string> = {
  GRAIL: "border-fuchsia-400/80 bg-fuchsia-900/40 text-fuchsia-100",
  HOT: "border-amber-300/80 bg-amber-900/40 text-amber-100",
  WARM: "border-sky-300/70 bg-sky-900/40 text-sky-100",
  WATCH: "border-slate-400/60 bg-slate-800/50 text-slate-200"
};

function dateBadge(release: UpcomingRelease) {
  if (!release.date) return "TBA";
  if (release.released) return "RELEASED";
  return new Date(`${release.date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function countdownLabel(release: UpcomingRelease) {
  if (release.released) return "Out now";
  if (release.daysUntil === null) return "Date not announced";
  if (release.daysUntil === 0) return "Releases today";
  return `${release.daysUntil} day${release.daysUntil === 1 ? "" : "s"} to go`;
}

function AnticipationMeter({ release }: { release: UpcomingRelease }) {
  const score = Math.round(release.anticipation.score);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>Anticipation</span>
        <span className="font-terminal text-sm text-yellow-100">{score}/100 EST</span>
      </div>
      <div className="mt-1 h-2 border border-white/15 bg-black/40" role="img" aria-label={`Anticipation ${score} of 100`}>
        <div className="h-full bg-gradient-to-r from-emerald-400 to-fuchsia-400" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SavingToggle({
  release,
  saving,
  onToggle
}: {
  release: UpcomingRelease;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={saving}
      onClick={onToggle}
      className={`mt-3 min-h-[44px] cursor-pointer border-2 px-3 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
        saving
          ? "border-yellow-300 bg-yellow-300/20 text-yellow-100"
          : "border-slate-500/60 bg-black/30 text-slate-300"
      }`}
    >
      {saving ? "★ Saving for this" : "Save for this"}
    </button>
  );
}

function ReleaseCard({
  release,
  saving,
  onToggle
}: {
  release: UpcomingRelease;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="pixel-panel stagger-item p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-100">{release.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
            {release.kind} · {countdownLabel(release)}
          </p>
        </div>
        <span className={`pixel-chip border ${TIER_CLASS[release.anticipation.tier]}`}>
          {release.anticipation.tier}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
        <span className="rarity-chip">{dateBadge(release)}</span>
        {typeof release.msrpTotal === "number" && (
          <span className="font-terminal text-emerald-200">
            <Money value={release.msrpTotal} /> MSRP line total
          </span>
        )}
        {release.products && <span>{release.products.length} products</span>}
      </div>
      <AnticipationMeter release={release} />
      {release.notes && <p className="mt-2 text-xs leading-5 text-slate-400">{release.notes}</p>}
      <SavingToggle release={release} saving={saving} onToggle={onToggle} />
    </article>
  );
}

function cadenceSummary(recentSets: { name: string; releaseDate: string }[]) {
  if (recentSets.length < 2) return null;
  const times = recentSets
    .map((set) => Date.parse(set.releaseDate.replaceAll("/", "-")))
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  if (times.length < 2) return null;
  const gaps = times.slice(0, -1).map((time, index) => time - times[index + 1]);
  const meanWeeks = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length / (7 * 86_400_000);
  return Math.round(meanWeeks);
}

export function ReleaseRadar() {
  const state = useReleases();
  const savingFor = useSavingFor();

  const flagship = state.status === "ready" ? state.upcoming.find((release) => !release.released) : undefined;
  const rest = useMemo(
    () => (state.status === "ready" ? state.upcoming.filter((release) => release.id !== flagship?.id) : []),
    [state, flagship]
  );
  const groups = useMemo(() => groupByMonth(rest), [rest]);

  if (state.status === "loading") return <SkeletonPanel lines={10} />;
  if (state.status === "error") {
    return <EmptyState title="Release radar offline" body={`Could not load the release calendar: ${state.message}`} />;
  }

  const savedReleases = state.upcoming.filter((release) => savingFor.has(release.id));
  const savedTotal = savedReleases.reduce((sum, release) => sum + (release.msrpTotal ?? 0), 0);
  const nearestSaved = savedReleases
    .filter((release) => release.daysUntil !== null && !release.released)
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0))[0];
  const averageGapWeeks = cadenceSummary(state.recentSets);

  return (
    <section className="space-y-5">
      <SectionHeader kicker="RELEASE RADAR" title="Upcoming drops, anticipation, and what you're saving for" />

      <ReleaseConstellation
        upcoming={state.upcoming}
        recentSets={state.recentSets}
        savingIds={savingFor.ids}
        onToggleSaving={savingFor.toggle}
      />

      {savedReleases.length > 0 && (
        <div className="pixel-panel border-yellow-300/60 p-4" aria-live="polite">
          <p className="pixel-kicker">SAVING FOR</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-200">
            <span className="font-bold text-yellow-100">{savedReleases.map((release) => release.name).join(" · ")}</span>
            {savedTotal > 0 && (
              <span className="font-terminal text-emerald-200">
                <Money value={savedTotal} /> combined MSRP
              </span>
            )}
            <span className="text-slate-400">
              {nearestSaved
                ? `${nearestSaved.daysUntil} days until ${nearestSaved.name}`
                : "No street date announced yet — hold the line."}
            </span>
          </div>
        </div>
      )}

      {flagship && (
        <article className="pixel-hero !min-h-0 flex-col items-start gap-4 p-6">
          <div className="flex w-full flex-wrap items-start justify-between gap-3">
            <div>
              <p className="pixel-kicker">MOST ANTICIPATED</p>
              <h2 className="mt-2 text-2xl font-black text-emerald-100">{flagship.name}</h2>
              <p className="mt-1 text-sm text-slate-300">{countdownLabel(flagship)}</p>
            </div>
            <span className={`pixel-chip border text-base ${TIER_CLASS[flagship.anticipation.tier]}`}>
              {flagship.anticipation.tier}
            </span>
          </div>
          <div className="w-full max-w-xl">
            <AnticipationMeter release={flagship} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
            <span className="rarity-chip">{dateBadge(flagship)}</span>
            {typeof flagship.msrpTotal === "number" && (
              <span className="font-terminal text-emerald-200">
                <Money value={flagship.msrpTotal} /> full-line MSRP
              </span>
            )}
            {flagship.products && <span>{flagship.products.length} tracked products</span>}
          </div>
          {flagship.notes && <p className="max-w-2xl text-sm leading-6 text-slate-300">{flagship.notes}</p>}
          <SavingToggle
            release={flagship}
            saving={savingFor.has(flagship.id)}
            onToggle={() => savingFor.toggle(flagship.id)}
          />
        </article>
      )}

      {groups.map((group) => (
        <div key={group.month}>
          <h3 className="pixel-kicker mb-3">{group.month}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.releases.map((release) => (
              <ReleaseCard
                key={release.id}
                release={release}
                saving={savingFor.has(release.id)}
                onToggle={() => savingFor.toggle(release.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {groups.length === 0 && !flagship && (
        <EmptyState
          title="No releases tracked yet"
          body="Add upcoming drops to src/data/releases-seed.json — each entry needs a name, kind, date (or null for TBA), and hype inputs."
        />
      )}

      <div className="pixel-panel p-4">
        <p className="pixel-kicker">RECENT SET CADENCE</p>
        {state.recentSets.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {state.recentSets.map((set) => (
                <span key={set.name} className="rarity-chip">
                  {set.name} · {set.releaseDate.replaceAll("/", "-")}
                </span>
              ))}
            </div>
            {averageGapWeeks !== null && (
              <p className="mt-3 text-xs text-slate-400">
                A new set has shipped roughly every {averageGapWeeks} weeks — plan your budget around the gaps.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-400">Set history unavailable (database offline).</p>
        )}
      </div>
    </section>
  );
}
