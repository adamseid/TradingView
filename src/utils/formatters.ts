const numberFormatterCache = new Map<string, Intl.NumberFormat>()

function getNumberFormatter(
  minimumFractionDigits: number,
  maximumFractionDigits: number,
) {
  const cacheKey = `${minimumFractionDigits}:${maximumFractionDigits}`
  const existingFormatter = numberFormatterCache.get(cacheKey)

  if (existingFormatter) {
    return existingFormatter
  }

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  numberFormatterCache.set(cacheKey, formatter)
  return formatter
}

export function formatNumber(
  value: number | string | null | undefined,
  minimumFractionDigits = 0,
  maximumFractionDigits = 3,
) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return getNumberFormatter(minimumFractionDigits, maximumFractionDigits).format(
    numericValue,
  )
}

export function formatCurrency(
  value: number | string | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  const absoluteFormattedValue = formatNumber(
    Math.abs(numericValue),
    minimumFractionDigits,
    maximumFractionDigits,
  )

  return numericValue < 0
    ? `-$${absoluteFormattedValue}`
    : `$${absoluteFormattedValue}`
}

export function formatPercent(
  value: number | string | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  const formattedValue = formatNumber(
    Math.abs(numericValue) * 100,
    minimumFractionDigits,
    maximumFractionDigits,
  )

  return numericValue < 0 ? `-${formattedValue}%` : `${formattedValue}%`
}
