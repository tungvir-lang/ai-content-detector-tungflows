const nf = new Intl.NumberFormat("vi-VN");
const cf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export const fmtInt = (n: number): string => nf.format(Math.round(n));
export const fmtMoney = (n: number): string => `${cf.format(Math.round(n))}₫`;
export const fmtPct = (n: number): string => `${(n * 100).toFixed(2)}%`;
export const fmtX = (n: number): string => `${n.toFixed(2)}×`;
export const fmtDate = (ms: number): string => new Date(ms).toLocaleString("vi-VN");
