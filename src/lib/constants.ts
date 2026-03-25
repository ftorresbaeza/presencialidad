export type StatusCode =
  | "Of"
  | "Tb"
  | "DCH"
  | "DMH"
  | "DS"
  | "DV"
  | "DET"
  | "V"
  | "Li"
  | "Cs";

export const STATUS_LABELS: Record<StatusCode, string> = {
  Of: "Oficina",
  Tb: "Teletrabajo",
  DCH: "DCH",
  DMH: "DMH",
  DS: "DS",
  DV: "DV",
  DET: "DET",
  V: "Vacaciones",
  Li: "Licencia",
  Cs: "Comisión de Servicio",
};

export const STATUS_COLORS: Record<StatusCode, string> = {
  Of: "bg-green-500 text-white",
  Tb: "bg-blue-500 text-white",
  DCH: "bg-orange-400 text-white",
  DMH: "bg-orange-500 text-white",
  DS: "bg-amber-400 text-white",
  DV: "bg-yellow-400 text-gray-900",
  DET: "bg-amber-600 text-white",
  V: "bg-purple-500 text-white",
  Li: "bg-red-400 text-white",
  Cs: "bg-teal-500 text-white",
};

export const STATUS_BADGE_COLORS: Record<StatusCode, string> = {
  Of: "bg-green-100 text-green-800 border-green-300",
  Tb: "bg-blue-100 text-blue-800 border-blue-300",
  DCH: "bg-orange-100 text-orange-800 border-orange-300",
  DMH: "bg-orange-100 text-orange-900 border-orange-400",
  DS: "bg-amber-100 text-amber-800 border-amber-300",
  DV: "bg-yellow-100 text-yellow-800 border-yellow-300",
  DET: "bg-amber-100 text-amber-900 border-amber-400",
  V: "bg-purple-100 text-purple-800 border-purple-300",
  Li: "bg-red-100 text-red-800 border-red-300",
  Cs: "bg-teal-100 text-teal-800 border-teal-300",
};

export const ALL_STATUSES: StatusCode[] = [
  "Of",
  "Tb",
  "DCH",
  "DMH",
  "DS",
  "DV",
  "DET",
  "V",
  "Li",
  "Cs",
];
