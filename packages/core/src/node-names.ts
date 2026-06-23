const LOCATION_NAMES: Record<string, string> = {
  JP: "🇯🇵 Japan",
  KR: "🇰🇷 South Korea",
  SG: "🇸🇬 Singapore",
  HK: "🇭🇰 Hong Kong",
  TW: "🇹🇼 Taiwan",
  US: "🇺🇸 United States",
  CA: "🇨🇦 Canada",
  GB: "🇬🇧 United Kingdom",
  UK: "🇬🇧 United Kingdom",
  DE: "🇩🇪 Germany",
  FR: "🇫🇷 France",
  NL: "🇳🇱 Netherlands",
  SE: "🇸🇪 Sweden",
  CH: "🇨🇭 Switzerland",
  IT: "🇮🇹 Italy",
  ES: "🇪🇸 Spain",
  AU: "🇦🇺 Australia",
  IN: "🇮🇳 India",
  BR: "🇧🇷 Brazil",
  AE: "🇦🇪 United Arab Emirates",
  BH: "🇧🇭 Bahrain",
  ZA: "🇿🇦 South Africa",
};

export function nodeNameBaseFromLocation(location?: string): string {
  if (!location) {
    return "🌐 Unknown";
  }

  return LOCATION_NAMES[location.toUpperCase()] ?? "🌐 Unknown";
}

export function compactNodeName(nodeNameBase: string, index: number): string {
  return `${nodeNameBase} ${String(index + 1).padStart(2, "0")}`;
}
