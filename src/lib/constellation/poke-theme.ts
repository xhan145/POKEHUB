import type { Theme } from "@/lib/constellation/core/types";

// Dark background matching the app shell; emerald primary / gold secondary accents.
export const POKE_THEME: Theme = {
  background: "#08070d",
  accentPrimary: "#34d399",
  accentSecondary: "#fbbf24",
  gridPrimary: "#34d399",
  gridSecondary: "#fbbf24",
  defaultGradient: ["#0b1220", "#0e7490", "#6ee7b7"],
  anomalyWarn: "#f59e0b",
  anomalyError: "#ef4444"
};
