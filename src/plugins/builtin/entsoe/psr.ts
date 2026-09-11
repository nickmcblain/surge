import type { PsrType } from "../../../types/energy";

export type PsrGroup = "renewable" | "nuclear" | "fossil" | "hydro" | "other";

export interface PsrDef {
  code: PsrType;
  label: string;
  short: string;
  group: PsrGroup;
}

export const PSR_TYPES: readonly PsrDef[] = [
  { code: "B19", label: "Wind Onshore", short: "Wind On", group: "renewable" },
  { code: "B18", label: "Wind Offshore", short: "Wind Off", group: "renewable" },
  { code: "B16", label: "Solar", short: "Solar", group: "renewable" },
  { code: "B01", label: "Biomass", short: "Biomass", group: "renewable" },
  { code: "B09", label: "Geothermal", short: "Geotherm", group: "renewable" },
  { code: "B13", label: "Marine", short: "Marine", group: "renewable" },
  { code: "B15", label: "Other Renewable", short: "Oth Renew", group: "renewable" },
  { code: "B14", label: "Nuclear", short: "Nuclear", group: "nuclear" },
  { code: "B11", label: "Hydro Run-of-river", short: "Hydro RoR", group: "hydro" },
  { code: "B12", label: "Hydro Reservoir", short: "Hydro Res", group: "hydro" },
  { code: "B10", label: "Hydro Pumped Storage", short: "Pumped", group: "hydro" },
  { code: "B04", label: "Fossil Gas", short: "Gas", group: "fossil" },
  { code: "B05", label: "Fossil Hard Coal", short: "Hard Coal", group: "fossil" },
  { code: "B02", label: "Fossil Lignite", short: "Lignite", group: "fossil" },
  { code: "B06", label: "Fossil Oil", short: "Oil", group: "fossil" },
  { code: "B03", label: "Fossil Coal-derived Gas", short: "Coal Gas", group: "fossil" },
  { code: "B07", label: "Fossil Oil Shale", short: "Oil Shale", group: "fossil" },
  { code: "B08", label: "Fossil Peat", short: "Peat", group: "fossil" },
  { code: "B17", label: "Waste", short: "Waste", group: "other" },
  { code: "B25", label: "Energy Storage", short: "Storage", group: "other" },
  { code: "B20", label: "Other", short: "Other", group: "other" },
];

const BY_CODE = new Map(PSR_TYPES.map((entry) => [entry.code, entry] as const));

export function psrDef(code: PsrType): PsrDef {
  return BY_CODE.get(code) ?? { code, label: code, short: code, group: "other" };
}

export const PSR_GROUP_LABELS: Record<PsrGroup, string> = {
  renewable: "Renewables",
  nuclear: "Nuclear",
  hydro: "Hydro",
  fossil: "Fossil",
  other: "Other",
};

export const PSR_GROUP_ORDER: readonly PsrGroup[] = ["renewable", "hydro", "nuclear", "fossil", "other"];

export const RES_TYPES: readonly PsrType[] = ["B19", "B18", "B16"];
