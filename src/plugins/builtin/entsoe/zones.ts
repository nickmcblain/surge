/**
 * Bidding zones the terminal knows about. This is the energy equivalent of a
 * ticker list: the code is what users type (`DA DE-LU`), the EIC is what
 * ENTSO-E wants, and the region drives grouping on the zone board.
 */

export type ZoneRegion = "central" | "west" | "nordic" | "south" | "east" | "gb";

export const ZONE_REGION_LABELS: Record<ZoneRegion, string> = {
  central: "Central Europe",
  west: "Western Europe",
  nordic: "Nordics & Baltics",
  south: "Southern Europe",
  east: "Central & Eastern Europe",
  gb: "Great Britain",
};

export const ZONE_REGION_ORDER: readonly ZoneRegion[] = ["central", "west", "nordic", "south", "east", "gb"];

export interface BiddingZone {
  code: string;
  name: string;
  eic: string;
  region: ZoneRegion;
  /** IANA time zone the local trading day is defined in. */
  timeZone: string;
  currency: string;
  aliases?: readonly string[];
}

export const BIDDING_ZONES: readonly BiddingZone[] = [
  { code: "DE-LU", name: "Germany-Luxembourg", eic: "10Y1001A1001A82H", region: "central", timeZone: "Europe/Berlin", currency: "EUR", aliases: ["DE", "GER", "DELU"] },
  { code: "AT", name: "Austria", eic: "10YAT-APG------L", region: "central", timeZone: "Europe/Vienna", currency: "EUR" },
  { code: "CH", name: "Switzerland", eic: "10YCH-SWISSGRIDZ", region: "central", timeZone: "Europe/Zurich", currency: "EUR" },
  { code: "CZ", name: "Czechia", eic: "10YCZ-CEPS-----N", region: "central", timeZone: "Europe/Prague", currency: "EUR" },
  { code: "PL", name: "Poland", eic: "10YPL-AREA-----S", region: "central", timeZone: "Europe/Warsaw", currency: "EUR" },

  { code: "FR", name: "France", eic: "10YFR-RTE------C", region: "west", timeZone: "Europe/Paris", currency: "EUR" },
  { code: "NL", name: "Netherlands", eic: "10YNL----------L", region: "west", timeZone: "Europe/Amsterdam", currency: "EUR" },
  { code: "BE", name: "Belgium", eic: "10YBE----------2", region: "west", timeZone: "Europe/Brussels", currency: "EUR" },

  { code: "DK1", name: "Denmark West", eic: "10YDK-1--------W", region: "nordic", timeZone: "Europe/Copenhagen", currency: "EUR" },
  { code: "DK2", name: "Denmark East", eic: "10YDK-2--------M", region: "nordic", timeZone: "Europe/Copenhagen", currency: "EUR" },
  { code: "NO1", name: "Norway Oslo", eic: "10YNO-1--------2", region: "nordic", timeZone: "Europe/Oslo", currency: "EUR" },
  { code: "NO2", name: "Norway Kristiansand", eic: "10YNO-2--------T", region: "nordic", timeZone: "Europe/Oslo", currency: "EUR" },
  { code: "NO3", name: "Norway Trondheim", eic: "10YNO-3--------J", region: "nordic", timeZone: "Europe/Oslo", currency: "EUR" },
  { code: "NO4", name: "Norway Tromso", eic: "10YNO-4--------9", region: "nordic", timeZone: "Europe/Oslo", currency: "EUR" },
  { code: "NO5", name: "Norway Bergen", eic: "10Y1001A1001A48H", region: "nordic", timeZone: "Europe/Oslo", currency: "EUR" },
  { code: "SE1", name: "Sweden Lulea", eic: "10Y1001A1001A44P", region: "nordic", timeZone: "Europe/Stockholm", currency: "EUR" },
  { code: "SE2", name: "Sweden Sundsvall", eic: "10Y1001A1001A45N", region: "nordic", timeZone: "Europe/Stockholm", currency: "EUR" },
  { code: "SE3", name: "Sweden Stockholm", eic: "10Y1001A1001A46L", region: "nordic", timeZone: "Europe/Stockholm", currency: "EUR" },
  { code: "SE4", name: "Sweden Malmo", eic: "10Y1001A1001A47J", region: "nordic", timeZone: "Europe/Stockholm", currency: "EUR" },
  { code: "FI", name: "Finland", eic: "10YFI-1--------U", region: "nordic", timeZone: "Europe/Helsinki", currency: "EUR" },
  { code: "EE", name: "Estonia", eic: "10Y1001A1001A39I", region: "nordic", timeZone: "Europe/Tallinn", currency: "EUR" },
  { code: "LV", name: "Latvia", eic: "10YLV-1001A00074", region: "nordic", timeZone: "Europe/Riga", currency: "EUR" },
  { code: "LT", name: "Lithuania", eic: "10YLT-1001A0008Q", region: "nordic", timeZone: "Europe/Vilnius", currency: "EUR" },

  { code: "ES", name: "Spain", eic: "10YES-REE------0", region: "south", timeZone: "Europe/Madrid", currency: "EUR" },
  { code: "PT", name: "Portugal", eic: "10YPT-REN------W", region: "south", timeZone: "Europe/Lisbon", currency: "EUR" },
  { code: "IT-NORD", name: "Italy North", eic: "10Y1001A1001A73I", region: "south", timeZone: "Europe/Rome", currency: "EUR", aliases: ["IT-NORTH", "ITN", "IT"] },
  { code: "IT-CNOR", name: "Italy Centre-North", eic: "10Y1001A1001A70O", region: "south", timeZone: "Europe/Rome", currency: "EUR" },
  { code: "IT-CSUD", name: "Italy Centre-South", eic: "10Y1001A1001A71M", region: "south", timeZone: "Europe/Rome", currency: "EUR" },
  { code: "IT-SUD", name: "Italy South", eic: "10Y1001A1001A788", region: "south", timeZone: "Europe/Rome", currency: "EUR" },
  { code: "IT-SICI", name: "Italy Sicily", eic: "10Y1001A1001A75E", region: "south", timeZone: "Europe/Rome", currency: "EUR" },
  { code: "IT-SARD", name: "Italy Sardinia", eic: "10Y1001A1001A74G", region: "south", timeZone: "Europe/Rome", currency: "EUR" },
  { code: "GR", name: "Greece", eic: "10YGR-HTSO-----Y", region: "south", timeZone: "Europe/Athens", currency: "EUR" },

  { code: "HU", name: "Hungary", eic: "10YHU-MAVIR----U", region: "east", timeZone: "Europe/Budapest", currency: "EUR" },
  { code: "SK", name: "Slovakia", eic: "10YSK-SEPS-----K", region: "east", timeZone: "Europe/Bratislava", currency: "EUR" },
  { code: "SI", name: "Slovenia", eic: "10YSI-ELES-----O", region: "east", timeZone: "Europe/Ljubljana", currency: "EUR" },
  { code: "HR", name: "Croatia", eic: "10YHR-HEP------M", region: "east", timeZone: "Europe/Zagreb", currency: "EUR" },
  { code: "RO", name: "Romania", eic: "10YRO-TEL------P", region: "east", timeZone: "Europe/Bucharest", currency: "EUR" },
  { code: "BG", name: "Bulgaria", eic: "10YCA-BULGARIA-R", region: "east", timeZone: "Europe/Sofia", currency: "EUR" },
  { code: "RS", name: "Serbia", eic: "10YCS-SERBIATSOV", region: "east", timeZone: "Europe/Belgrade", currency: "EUR" },

  { code: "GB", name: "Great Britain", eic: "10YGB----------A", region: "gb", timeZone: "Europe/London", currency: "GBP", aliases: ["UK"] },
];

const BY_CODE = new Map<string, BiddingZone>();
for (const zone of BIDDING_ZONES) {
  BY_CODE.set(zone.code, zone);
  for (const alias of zone.aliases ?? []) BY_CODE.set(alias, zone);
}

/** Resolves `de-lu`, `DE_LU`, `de`, or an EIC to a zone; null when unknown. */
export function resolveZone(input: string | null | undefined): BiddingZone | null {
  if (!input) return null;
  const normalized = input.trim().toUpperCase().replace(/_/g, "-");
  if (!normalized) return null;
  const direct = BY_CODE.get(normalized);
  if (direct) return direct;
  return BIDDING_ZONES.find((zone) => zone.eic === normalized) ?? null;
}

export function getZonesByRegion(zones: readonly BiddingZone[] = BIDDING_ZONES): Map<ZoneRegion, BiddingZone[]> {
  const grouped = new Map<ZoneRegion, BiddingZone[]>();
  for (const region of ZONE_REGION_ORDER) grouped.set(region, []);
  for (const zone of zones) grouped.get(zone.region)!.push(zone);
  for (const region of ZONE_REGION_ORDER) {
    if (grouped.get(region)!.length === 0) grouped.delete(region);
  }
  return grouped;
}

/** Zones shown on the default board: one per country plus the large split markets. */
export const DEFAULT_BOARD_ZONES: readonly string[] = [
  "DE-LU", "AT", "CH", "CZ", "PL",
  "FR", "NL", "BE",
  "DK1", "DK2", "NO1", "NO2", "SE3", "SE4", "FI",
  "ES", "PT", "IT-NORD", "GR",
  "HU", "SK", "RO",
  "GB",
];
