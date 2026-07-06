// Currency conversion and formatting utilities

export type CurrencyType = 'INR' | 'USD' | 'EUR' | 'GBP';

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export const getRatesInUSD = (usdInrRate: number): Record<CurrencyType, number> => ({
  USD: 1,
  INR: 1 / usdInrRate,
  EUR: 1.08, // 1 EUR = 1.08 USD
  GBP: 1.27  // 1 GBP = 1.27 USD
});

/**
 * Converts an amount from one currency to another using the live USD/INR rate.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyType,
  to: CurrencyType,
  usdInrRate: number
): number {
  if (from === to) return amount;
  
  const rates = getRatesInUSD(usdInrRate);
  
  // 1. Convert source currency to USD
  const amountInUSD = amount * rates[from];
  
  // 2. Convert USD to target currency
  const targetRate = rates[to];
  return amountInUSD / targetRate;
}

/**
 * Formats a currency value elegantly based on the selected currency's locale rules.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyType,
  compact = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  
  if (compact) {
    if (currency === 'INR') {
      if (amount >= 10000000) {
        return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
      }
      if (amount >= 100000) {
        return `${symbol}${(amount / 100000).toFixed(2)} L`;
      }
      if (amount >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(1)}k`;
      }
    } else {
      if (amount >= 1000000000) {
        return `${symbol}${(amount / 1000000000).toFixed(2)}B`;
      }
      if (amount >= 1000000) {
        return `${symbol}${(amount / 1000000).toFixed(2)}M`;
      }
      if (amount >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(1)}k`;
      }
    }
  }

  // Locale-specific formatting
  const locale = currency === 'INR' ? 'en-IN' : currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'en-GB';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    // Fallback if formatting fails
    return `${symbol}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  }
}
