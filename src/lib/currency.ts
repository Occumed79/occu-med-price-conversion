import type { RatesResponse } from "@/types/currency";

const API_URL = "https://api.exchangerate-api.com/v4/latest/USD";

export async function fetchLiveRates(): Promise<RatesResponse> {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch rates: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<RatesResponse>;
}

export function formatRate(value: number): string {
  if (value >= 1) {
    return value.toFixed(4);
  }
  if (value >= 0.01) {
    return value.toFixed(4);
  }
  return value.toFixed(6);
}

export function formatCurrency(value: number, symbol: string): string {
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function convertToUsd(amount: number, rateToUsd: number): number {
  return amount * rateToUsd;
}
