export interface Currency {
  code: string;
  name: string;
  symbol: string;
  region?: string;
}

export interface ActiveCurrency extends Currency {
  amount: number;
  rateToUsd: number;
  convertedUsd: number;
}

export interface RatesResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}
