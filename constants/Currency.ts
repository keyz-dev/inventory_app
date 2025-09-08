export function formatXAF(amount: number): string {
  try {
    // Use a locale common in Cameroon for FCFA formatting
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: 'XAF',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if Intl not available
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString()} XAF`;
  }
}


