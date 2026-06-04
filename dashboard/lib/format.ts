export function usd(n: number): string {
  const abs = Math.abs(n);
  const maxFrac = abs > 0 && abs < 100 ? 2 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: maxFrac,
    maximumFractionDigits: maxFrac,
  }).format(n);
}

/** CPST and other per-outcome costs — never round sub-dollar values to $0. */
export function usdCpst(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "$0";
  if (abs < 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(n);
  }
  if (abs < 100) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return usd(n);
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
