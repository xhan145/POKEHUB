import { anticipationTier, scoreAnticipation } from "@/workers/score-market";
import type { ReleaseSeedEntry, UpcomingRelease } from "@/types/pokehub";

const DAY_MS = 86_400_000;

function parseUtcDate(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysUntil(dateIso: string | null, nowMs: number): number | null {
  if (!dateIso) return null;
  const diff = parseUtcDate(dateIso) - nowMs;
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

export function isReleased(dateIso: string | null, nowMs: number): boolean {
  if (!dateIso) return false;
  return parseUtcDate(dateIso) <= nowMs;
}

export function buildUpcoming(
  seed: ReleaseSeedEntry[],
  pressureByRelease: Record<string, { marketPressure: number; dataConfidence: number }>,
  nowMs: number
): UpcomingRelease[] {
  const releases = seed.map<UpcomingRelease>((release) => {
    const pressure = pressureByRelease[release.id];
    const score = scoreAnticipation({
      hype: release.hype,
      marketPressure: pressure?.marketPressure,
      dataConfidence: pressure?.dataConfidence
    });

    return {
      ...release,
      anticipation: { score, tier: anticipationTier(score) },
      daysUntil: daysUntil(release.date, nowMs),
      released: isReleased(release.date, nowMs)
    };
  });

  // Dated-unreleased first (most anticipated leading), then TBA, then released.
  const rank = (release: UpcomingRelease) => (release.released ? 2 : release.date === null ? 1 : 0);
  return releases.sort(
    (a, b) => rank(a) - rank(b) || b.anticipation.score - a.anticipation.score
  );
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function groupByMonth(releases: UpcomingRelease[]): { month: string; releases: UpcomingRelease[] }[] {
  const dated = new Map<string, { sortKey: number; releases: UpcomingRelease[] }>();
  const tba: UpcomingRelease[] = [];

  for (const release of releases) {
    if (!release.date) {
      tba.push(release);
      continue;
    }
    const [year, month] = release.date.split("-").map(Number);
    const label = `${MONTH_LABELS[month - 1]} ${year}`;
    const existing = dated.get(label);
    if (existing) existing.releases.push(release);
    else dated.set(label, { sortKey: year * 12 + month, releases: [release] });
  }

  const groups = [...dated.entries()]
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([month, bucket]) => ({ month, releases: bucket.releases }));

  if (tba.length > 0) groups.push({ month: "TBA", releases: tba });
  return groups;
}
