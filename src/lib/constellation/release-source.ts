import type { FlatNode } from "@/lib/constellation/providers";
import type { AnticipationTier, UpcomingRelease } from "@/types/pokehub";

export const TIER_COLOR: Record<AnticipationTier, string> = {
  GRAIL: "#E879F9",
  HOT: "#F2C438",
  WARM: "#4C86D6",
  WATCH: "#8892A0"
};

const SET_COLOR = "#4CA64C";

function releaseMass(msrpTotal: number | undefined) {
  const mass = Math.log10((msrpTotal ?? 0) + 1) / 3;
  return Math.max(0.05, Math.min(1, mass));
}

function releaseLabel(release: UpcomingRelease) {
  const when = release.daysUntil === null ? "TBA" : `${release.daysUntil}d`;
  return `${release.name} · ${when}`;
}

/**
 * Maps the Release Radar payload onto the constellation engine's tree:
 * root -> UPCOMING / RECENT SETS clusters -> release orbs -> product moons.
 * Channels: color = anticipation tier, mass = MSRP line total (log),
 * luminosity = anticipation score, warn ring = saving-for.
 */
export function buildReleaseFlatNodes(
  upcoming: UpcomingRelease[],
  recentSets: { name: string; releaseDate: string }[],
  savingIds: string[]
): FlatNode[] {
  const nodes: FlatNode[] = [];

  if (upcoming.length > 0) {
    nodes.push({
      id: "upcoming",
      parentId: null,
      node: { label: `UPCOMING (${upcoming.length})`, color: "#F2C438", mass: 0.6 }
    });

    for (const release of upcoming) {
      const color = TIER_COLOR[release.anticipation.tier];
      nodes.push({
        id: `release:${release.id}`,
        parentId: "upcoming",
        node: {
          label: releaseLabel(release),
          color,
          mass: releaseMass(release.msrpTotal),
          luminosity: release.anticipation.score / 100,
          anomaly: savingIds.includes(release.id) ? "warn" : "none",
          data: release
        }
      });

      (release.products ?? []).forEach((productName, index) => {
        nodes.push({
          id: `product:${release.id}:${index}`,
          parentId: `release:${release.id}`,
          node: {
            label: productName,
            color,
            mass: 0.1,
            luminosity: 0.3,
            data: { productName, releaseId: release.id }
          }
        });
      });
    }
  }

  if (recentSets.length > 0) {
    nodes.push({
      id: "recent-sets",
      parentId: null,
      node: { label: `RECENT SETS (${recentSets.length})`, color: SET_COLOR, mass: 0.4 }
    });

    recentSets.forEach((set, index) => {
      const date = set.releaseDate.replaceAll("/", "-");
      nodes.push({
        id: `set:${index}`,
        parentId: "recent-sets",
        node: {
          label: `${set.name} · ${date}`,
          color: SET_COLOR,
          mass: 0.15,
          luminosity: Math.max(0.2, Math.round((0.9 - index * 0.08) * 100) / 100),
          data: { name: set.name, releaseDate: date }
        }
      });
    });
  }

  return nodes;
}
