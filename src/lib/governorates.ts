export const GOVERNORATES = [
  "بغداد",
  "النجف",
  "كربلاء",
  "بابل",
  "الأنبار",
  "القادسية",
  "البصرة",
  "ذي قار",
  "ميسان",
  "واسط",
  "ديالى",
  "صلاح الدين",
  "نينوى",
  "كركوك",
  "أربيل",
  "السليمانية",
  "دهوك",
  "المثنى",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];
