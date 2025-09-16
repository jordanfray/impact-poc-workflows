/**
 * Formats a number as currency (USD)
 * @param amount - The amount to format (can be in cents or dollars)
 * @param isInCents - Whether the amount is in cents (default: false)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number | string, isInCents: boolean = false): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    return '$0.00'
  }
  
  // Convert cents to dollars if needed
  const dollarAmount = isInCents ? numericAmount / 100 : numericAmount
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollarAmount)
}

/**
 * Formats a number as currency without the currency symbol
 * @param amount - The amount to format (can be in cents or dollars)
 * @param isInCents - Whether the amount is in cents (default: false)
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatCurrencyAmount(amount: number | string, isInCents: boolean = false): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    return '0.00'
  }
  
  // Convert cents to dollars if needed
  const dollarAmount = isInCents ? numericAmount / 100 : numericAmount
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollarAmount)
}
