export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  region?: string;
}

export interface CurrencyCategory {
  category: string;
  items: Currency[];
}

export const CURRENCIES: Currency[] = [
  { id: "USD", code: "USD", name: "US Dollar", symbol: "$", region: "North America" },
  { id: "EUR", code: "EUR", name: "Euro", symbol: "€", region: "Europe" },
  { id: "GBP", code: "GBP", name: "British Pound", symbol: "£", region: "Europe" },
  { id: "CAD", code: "CAD", name: "Canadian Dollar", symbol: "C$", region: "North America" },
  { id: "AUD", code: "AUD", name: "Australian Dollar", symbol: "A$", region: "Oceania" },
  { id: "JPY", code: "JPY", name: "Japanese Yen", symbol: "¥", region: "Asia" },
  { id: "CHF", code: "CHF", name: "Swiss Franc", symbol: "Fr", region: "Europe" },
  { id: "MXN", code: "MXN", name: "Mexican Peso", symbol: "MX$", region: "North America" },
  { id: "BRL", code: "BRL", name: "Brazilian Real", symbol: "R$", region: "South America" },
  { id: "INR", code: "INR", name: "Indian Rupee", symbol: "₹", region: "Asia" },
  { id: "SGD", code: "SGD", name: "Singapore Dollar", symbol: "S$", region: "Asia" },
  { id: "AED", code: "AED", name: "UAE Dirham", symbol: "AED", region: "Middle East" },
  { id: "ILS", code: "ILS", name: "Israeli Shekel", symbol: "₪", region: "Middle East" },
  { id: "CNY", code: "CNY", name: "Chinese Yuan", symbol: "¥", region: "Asia" },
  { id: "HKD", code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", region: "Asia" },
  { id: "KRW", code: "KRW", name: "South Korean Won", symbol: "₩", region: "Asia" },
  { id: "NZD", code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", region: "Oceania" },
  { id: "SEK", code: "SEK", name: "Swedish Krona", symbol: "kr", region: "Europe" },
  { id: "NOK", code: "NOK", name: "Norwegian Krone", symbol: "kr", region: "Europe" },
  { id: "DKK", code: "DKK", name: "Danish Krone", symbol: "kr", region: "Europe" },
  { id: "ZAR", code: "ZAR", name: "South African Rand", symbol: "R", region: "Africa" },
  { id: "THB", code: "THB", name: "Thai Baht", symbol: "฿", region: "Asia" },
  { id: "PHP", code: "PHP", name: "Philippine Peso", symbol: "₱", region: "Asia" },
  { id: "IDR", code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", region: "Asia" },
  { id: "MYR", code: "MYR", name: "Malaysian Ringgit", symbol: "RM", region: "Asia" },
];

export const CURRENCY_CATEGORIES: CurrencyCategory[] = [
  {
    category: "Major Currencies",
    items: CURRENCIES.filter((c) => ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].includes(c.code)),
  },
  {
    category: "Americas",
    items: CURRENCIES.filter((c) => c.region === "North America" || c.region === "South America"),
  },
  {
    category: "Europe",
    items: CURRENCIES.filter((c) => c.region === "Europe"),
  },
  {
    category: "Asia Pacific",
    items: CURRENCIES.filter((c) => c.region === "Asia" || c.region === "Oceania"),
  },
  {
    category: "Middle East & Africa",
    items: CURRENCIES.filter((c) => c.region === "Middle East" || c.region === "Africa"),
  },
];
