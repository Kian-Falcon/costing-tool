export type ParsedDimensions = {
  raw: string;
  L: number;
  W?: number;
  H?: number;
  diameter?: number;
  planArea: number;
  isCircular: boolean;
};

const INCH_TO_MM = 25.4;

export function parseDims(input: string): ParsedDimensions {
  const raw = input.trim();
  const metricInput = imperialToMm(raw);
  const normalized = metricInput
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\b(w|width)\s*/g, "w")
    .replace(/\b(d|depth)\s*/g, "d")
    .replace(/\b(h|height)\s*/g, "h")
    .replace(/\b(seat\s*ht|ht)\s*/g, "h")
    .replace(/,/g, " ");

  const isImperial = /\b(in|inch|inches|")\b/.test(normalized);
  const factor = isImperial ? INCH_TO_MM : 1;
  const circular = normalized.match(/\b(dia|diameter|ø)\s*[:.\-]?\s*(\d+(?:\.\d+)?)/);

  if (circular) {
    const diameter = Number(circular[2]) * factor;
    const rest = normalized.slice(circular.index! + circular[0].length);
    const height = firstNumber(rest) ? firstNumber(rest)! * factor : undefined;
    return {
      raw,
      L: diameter,
      W: diameter,
      H: height,
      diameter,
      planArea: Math.PI * Math.pow(diameter / 1000 / 2, 2),
      isCircular: true
    };
  }

  const labelled = new Map<string, number>();
  for (const match of normalized.matchAll(/\b([lwhd])\s*[:\-]?\s*(\d+(?:\.\d+)?)/g)) {
    labelled.set(match[1], Number(match[2]) * factor);
  }

  const numbers = [...normalized.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]) * factor);
  const hasLength = labelled.has("l");
  const L = labelled.get("l") ?? labelled.get("w") ?? numbers[0] ?? 0;
  const W = hasLength ? labelled.get("w") ?? labelled.get("d") ?? numbers[1] : labelled.get("d") ?? labelled.get("w") ?? numbers[1];
  const H = labelled.get("h") ?? numbers[2];
  const widthForArea = W ?? L;

  return {
    raw,
    L,
    W,
    H,
    planArea: (L / 1000) * (widthForArea / 1000),
    isCircular: false
  };
}

function firstNumber(input: string): number | undefined {
  const match = input.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function imperialToMm(input: string): string {
  return input.replace(/(\d+)\s*['′]\s*[-\s]?\s*(\d+)?\s*["″]?/g, (full, ft, inch) => {
    const feet = Number(ft) || 0;
    const inches = Number(inch) || 0;
    if (!feet && !inches) return full;
    return String(Math.round(feet * 304.8 + inches * 25.4));
  });
}
