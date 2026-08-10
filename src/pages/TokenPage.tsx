import { useEffect, useMemo, useState } from 'react'
import Accordion from 'react-bootstrap/Accordion'
import { useParams } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

import AppNavbar from '../components/AppNavbar'
import PerformanceCalculator, {
  type PerformanceCalculatorDayPoint,
} from '../components/PerformanceCalculator'
import ScoreValidationStudy from '../components/ScoreValidationStudy'
import TokenLineChart from '../components/TokenLineChart'
import TokenMultiLineChart from '../components/TokenMultiLineChart'
import TokenHistoryTable, { type TokenHistoryRow } from '../components/TokenHistoryTable'
import TradingViewWidget from '../components/TradingViewWidget'
import { formatCurrency, formatNumber } from '../utils/formatters'

interface StockDetailApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock_data: TokenHistoryRow[]
    }
  }
}

interface ChartPoint {
  label: string
  value: number
}

interface ChartDataset {
  label: string
  color: string
  data: ChartPoint[]
}

interface PreparedRow {
  row: TokenHistoryRow
  timestamp: number
  dayKey: string
  dayLabel: string
  weekday: string
  hour: number
  year: number
  month: number
  day: number
}

interface MetricBuckets {
  price: number[]
  dailyMacd: number[]
  weeklyMacd: number[]
  dailyMacdVelocity: number[]
  weeklyMacdVelocity: number[]
  sma50: number[]
  sma100: number[]
  sma200: number[]
  support: number[]
  resistance: number[]
  pivotClassicMiddle: number[]
  pivotClassicS2: number[]
  pivotClassicS3: number[]
  pivotClassicR2: number[]
  pivotClassicR3: number[]
  ema20: number[]
  ema50: number[]
  ema100: number[]
  ema200: number[]
  bollingerBandsLower: number[]
  bollingerBandsUpper: number[]
  rsi: number[]
  yesterdayRsi: number[]
  stochRsiK: number[]
  adx: number[]
  adxDiPositive: number[]
  adxDiNegative: number[]
  originalStrategyScore: number[]
  macdStrategyScore: number[]
  strategyThreeScore: number[]
  marketRegime: string[]
}

interface AggregatedPoint {
  bucketKey: string
  label: string
  price: number | null
  dailyMacd: number | null
  weeklyMacd: number | null
  dailyMacdVelocity: number | null
  weeklyMacdVelocity: number | null
  sma50: number | null
  sma100: number | null
  sma200: number | null
  support: number | null
  resistance: number | null
  pivotClassicMiddle: number | null
  pivotClassicS2: number | null
  pivotClassicS3: number | null
  pivotClassicR2: number | null
  pivotClassicR3: number | null
  ema20: number | null
  ema50: number | null
  ema100: number | null
  ema200: number | null
  bollingerBandsLower: number | null
  bollingerBandsUpper: number | null
  rsi: number | null
  yesterdayRsi: number | null
  stochRsiK: number | null
  adx: number | null
  adxDiPositive: number | null
  adxDiNegative: number | null
  originalStrategyScore: number | null
  macdStrategyScore: number | null
  strategyThreeScore: number | null
  marketRegime: string | null
}

interface TimeframeChartBundle {
  priceSeries: ChartPoint[]
  dailyMacdSeries: ChartPoint[]
  weeklyMacdSeries: ChartPoint[]
  movingAverageDatasets: ChartDataset[]
  scoreSeries: ChartPoint[]
  threeDayStrategySeries: ChartPoint[]
}

interface StrategyThreeTechnicalChartBundle {
  marketRegimeSeries: ChartPoint[]
  supportResistanceDatasets: ChartDataset[]
  pivotDatasets: ChartDataset[]
  emaDatasets: ChartDataset[]
  bollingerDatasets: ChartDataset[]
  adxDatasets: ChartDataset[]
  rsiDatasets: ChartDataset[]
  macdHistogramDatasets: ChartDataset[]
  macdVelocityDatasets: ChartDataset[]
}

type StrategyKey = 'original' | 'macd' | 'strategy3'
type TimeframeKey = '1h' | '4h' | '1d' | '1w' | '1m'

interface TimeframeOption {
  key: TimeframeKey
  label: string
}

interface TimeframeSectionData {
  key: TimeframeKey
  label: string
  points: AggregatedPoint[]
  originalCharts: TimeframeChartBundle
  macdCharts: TimeframeChartBundle
  strategyThreeCharts: TimeframeChartBundle
  strategyThreeTechnicalCharts: StrategyThreeTechnicalChartBundle
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { key: '1h', label: '1 hour' },
  { key: '4h', label: '4 hour' },
  { key: '1d', label: '1 day' },
  { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' },
]

const EASTERN_TIME_ZONE = 'America/New_York'
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const EASTERN_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function getEasternDateParts(value: string) {
  const date = new Date(value)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) {
    return null
  }

  const parts = EASTERN_PARTS_FORMATTER.formatToParts(date)
  const lookup = new Map(parts.map((part) => [part.type, part.value]))
  const year = lookup.get('year')
  const month = lookup.get('month')
  const day = lookup.get('day')
  const weekday = lookup.get('weekday')
  const hour = lookup.get('hour')

  if (!year || !month || !day || !weekday || !hour) {
    return null
  }

  return {
    timestamp,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    dayKey: `${year}-${month}-${day}`,
    dayLabel: `${MONTH_LABELS[Number(month) - 1]} ${Number(day)}`,
    weekday,
    hour: Number(hour),
  }
}

function padTwoDigits(value: number) {
  return String(value).padStart(2, '0')
}

function formatMonthDay(month: number, day: number) {
  return `${MONTH_LABELS[month - 1]} ${day}`
}

function formatHourLabel(month: number, day: number, hour: number) {
  return `${formatMonthDay(month, day)} ${padTwoDigits(hour)}:00`
}

function formatMonthLabel(month: number, year: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`
}

function getWeekStartDate(year: number, month: number, day: number) {
  const currentDate = new Date(Date.UTC(year, month - 1, day))
  const weekday = currentDate.getUTCDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  currentDate.setUTCDate(currentDate.getUTCDate() - offset)
  return currentDate
}

function toNumericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function prepareRows(rows: TokenHistoryRow[], isCrypto: boolean) {
  return rows
    .map((row) => {
      const dateParts = getEasternDateParts(row.date)

      if (!dateParts) {
        return null
      }

      if (!isCrypto) {
        const isWeekend = dateParts.weekday === 'Sat' || dateParts.weekday === 'Sun'
        const isAllowedHour = dateParts.hour >= 7 && dateParts.hour < 14

        if (isWeekend || !isAllowedHour) {
          return null
        }
      }

      return {
        row,
        timestamp: dateParts.timestamp,
        dayKey: dateParts.dayKey,
        dayLabel: dateParts.dayLabel,
        weekday: dateParts.weekday,
        hour: dateParts.hour,
        year: dateParts.year,
        month: dateParts.month,
        day: dateParts.day,
      }
    })
    .filter((entry): entry is PreparedRow => entry !== null)
}

function createMetricBuckets(): MetricBuckets {
  return {
    price: [],
    dailyMacd: [],
    weeklyMacd: [],
    dailyMacdVelocity: [],
    weeklyMacdVelocity: [],
    sma50: [],
    sma100: [],
    sma200: [],
    support: [],
    resistance: [],
    pivotClassicMiddle: [],
    pivotClassicS2: [],
    pivotClassicS3: [],
    pivotClassicR2: [],
    pivotClassicR3: [],
    ema20: [],
    ema50: [],
    ema100: [],
    ema200: [],
    bollingerBandsLower: [],
    bollingerBandsUpper: [],
    rsi: [],
    yesterdayRsi: [],
    stochRsiK: [],
    adx: [],
    adxDiPositive: [],
    adxDiNegative: [],
    originalStrategyScore: [],
    macdStrategyScore: [],
    strategyThreeScore: [],
    marketRegime: [],
  }
}

function appendNumericValue(target: number[], value: number | string | null | undefined) {
  const numericValue = toNumericValue(value)

  if (numericValue !== null) {
    target.push(numericValue)
  }
}

function appendTextValue(target: string[], value: string | null | undefined) {
  const normalizedValue = (value ?? '').trim()

  if (normalizedValue) {
    target.push(normalizedValue)
  }
}

function getAverageValue(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getMostCommonValue(values: string[]) {
  if (values.length === 0) {
    return null
  }

  const counts = new Map<string, number>()

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  let selectedValue: string | null = null
  let selectedCount = -1

  counts.forEach((count, value) => {
    if (count > selectedCount) {
      selectedValue = value
      selectedCount = count
    }
  })

  return selectedValue
}

function getBucketMetadata(row: PreparedRow, timeframe: TimeframeKey) {
  switch (timeframe) {
    case '1h':
      return {
        key: `${row.dayKey}-${padTwoDigits(row.hour)}`,
        label: formatHourLabel(row.month, row.day, row.hour),
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day, row.hour),
      }
    case '4h': {
      const startHour = Math.floor(row.hour / 4) * 4
      return {
        key: `${row.dayKey}-${padTwoDigits(startHour)}`,
        label: formatHourLabel(row.month, row.day, startHour),
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day, startHour),
      }
    }
    case '1d':
      return {
        key: row.dayKey,
        label: row.dayLabel,
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day),
      }
    case '1w': {
      const weekStart = getWeekStartDate(row.year, row.month, row.day)
      const month = weekStart.getUTCMonth() + 1
      const day = weekStart.getUTCDate()
      return {
        key: weekStart.toISOString().slice(0, 10),
        label: `Week of ${formatMonthDay(month, day)}`,
        startTimestamp: weekStart.getTime(),
      }
    }
    case '1m':
      return {
        key: `${row.year}-${padTwoDigits(row.month)}`,
        label: formatMonthLabel(row.month, row.year),
        startTimestamp: Date.UTC(row.year, row.month - 1, 1),
      }
  }
}

function aggregatePoints(preparedRows: PreparedRow[], timeframe: TimeframeKey) {
  const bucketMap = new Map<string, { key: string; label: string; startTimestamp: number; metrics: MetricBuckets }>()

  preparedRows.forEach((row) => {
    const bucket = getBucketMetadata(row, timeframe)
    const existingBucket = bucketMap.get(bucket.key) ?? {
      key: bucket.key,
      label: bucket.label,
      startTimestamp: bucket.startTimestamp,
      metrics: createMetricBuckets(),
    }

    appendNumericValue(existingBucket.metrics.price, row.row.current_price)
    appendNumericValue(existingBucket.metrics.dailyMacd, row.row.daily_macd_histogram)
    appendNumericValue(existingBucket.metrics.weeklyMacd, row.row.weekly_macd_histogram)
    appendNumericValue(existingBucket.metrics.dailyMacdVelocity, row.row.daily_macd_velocity)
    appendNumericValue(existingBucket.metrics.weeklyMacdVelocity, row.row.weekly_macd_velocity)
    appendNumericValue(existingBucket.metrics.sma50, row.row.sma_50)
    appendNumericValue(existingBucket.metrics.sma100, row.row.sma_100)
    appendNumericValue(existingBucket.metrics.sma200, row.row.sma_200)
    appendNumericValue(existingBucket.metrics.support, row.row.support)
    appendNumericValue(existingBucket.metrics.resistance, row.row.resistance)
    appendNumericValue(existingBucket.metrics.pivotClassicMiddle, row.row.pivot_classic_middle)
    appendNumericValue(existingBucket.metrics.pivotClassicS2, row.row.pivot_classic_s2)
    appendNumericValue(existingBucket.metrics.pivotClassicS3, row.row.pivot_classic_s3)
    appendNumericValue(existingBucket.metrics.pivotClassicR2, row.row.pivot_classic_r2)
    appendNumericValue(existingBucket.metrics.pivotClassicR3, row.row.pivot_classic_r3)
    appendNumericValue(existingBucket.metrics.ema20, row.row.ema_20)
    appendNumericValue(existingBucket.metrics.ema50, row.row.ema_50)
    appendNumericValue(existingBucket.metrics.ema100, row.row.ema_100)
    appendNumericValue(existingBucket.metrics.ema200, row.row.ema_200)
    appendNumericValue(existingBucket.metrics.bollingerBandsLower, row.row.bollinger_bands_lower)
    appendNumericValue(existingBucket.metrics.bollingerBandsUpper, row.row.bollinger_bands_upper)
    appendNumericValue(existingBucket.metrics.rsi, row.row.rsi)
    appendNumericValue(existingBucket.metrics.yesterdayRsi, row.row.yesterday_rsi)
    appendNumericValue(existingBucket.metrics.stochRsiK, row.row.stoch_rsi_k)
    appendNumericValue(existingBucket.metrics.adx, row.row.adx)
    appendNumericValue(existingBucket.metrics.adxDiPositive, row.row.adx_di_positive)
    appendNumericValue(existingBucket.metrics.adxDiNegative, row.row.adx_di_negative)
    appendNumericValue(existingBucket.metrics.originalStrategyScore, row.row.original_strategy_score)
    appendNumericValue(existingBucket.metrics.macdStrategyScore, row.row.macd_strategy_score)
    appendNumericValue(existingBucket.metrics.strategyThreeScore, row.row.strategy_three_score)
    appendTextValue(existingBucket.metrics.marketRegime, row.row.market_regime)

    bucketMap.set(bucket.key, existingBucket)
  })

  return [...bucketMap.values()]
    .sort((left, right) => left.startTimestamp - right.startTimestamp)
    .map((bucket) => ({
      bucketKey: bucket.key,
      label: bucket.label,
      price: getAverageValue(bucket.metrics.price),
      dailyMacd: getAverageValue(bucket.metrics.dailyMacd),
      weeklyMacd: getAverageValue(bucket.metrics.weeklyMacd),
      dailyMacdVelocity: getAverageValue(bucket.metrics.dailyMacdVelocity),
      weeklyMacdVelocity: getAverageValue(bucket.metrics.weeklyMacdVelocity),
      sma50: getAverageValue(bucket.metrics.sma50),
      sma100: getAverageValue(bucket.metrics.sma100),
      sma200: getAverageValue(bucket.metrics.sma200),
      support: getAverageValue(bucket.metrics.support),
      resistance: getAverageValue(bucket.metrics.resistance),
      pivotClassicMiddle: getAverageValue(bucket.metrics.pivotClassicMiddle),
      pivotClassicS2: getAverageValue(bucket.metrics.pivotClassicS2),
      pivotClassicS3: getAverageValue(bucket.metrics.pivotClassicS3),
      pivotClassicR2: getAverageValue(bucket.metrics.pivotClassicR2),
      pivotClassicR3: getAverageValue(bucket.metrics.pivotClassicR3),
      ema20: getAverageValue(bucket.metrics.ema20),
      ema50: getAverageValue(bucket.metrics.ema50),
      ema100: getAverageValue(bucket.metrics.ema100),
      ema200: getAverageValue(bucket.metrics.ema200),
      bollingerBandsLower: getAverageValue(bucket.metrics.bollingerBandsLower),
      bollingerBandsUpper: getAverageValue(bucket.metrics.bollingerBandsUpper),
      rsi: getAverageValue(bucket.metrics.rsi),
      yesterdayRsi: getAverageValue(bucket.metrics.yesterdayRsi),
      stochRsiK: getAverageValue(bucket.metrics.stochRsiK),
      adx: getAverageValue(bucket.metrics.adx),
      adxDiPositive: getAverageValue(bucket.metrics.adxDiPositive),
      adxDiNegative: getAverageValue(bucket.metrics.adxDiNegative),
      originalStrategyScore: getAverageValue(bucket.metrics.originalStrategyScore),
      macdStrategyScore: getAverageValue(bucket.metrics.macdStrategyScore),
      strategyThreeScore: getAverageValue(bucket.metrics.strategyThreeScore),
      marketRegime: getMostCommonValue(bucket.metrics.marketRegime),
    }))
}

function buildSeries(points: AggregatedPoint[], selector: (point: AggregatedPoint) => number | null) {
  return points.flatMap((point) => {
    const value = selector(point)

    if (value === null) {
      return []
    }

    return [{
      label: point.label,
      value,
    }]
  })
}

function buildRollingAverageSeries(
  points: AggregatedPoint[],
  selector: (point: AggregatedPoint) => number | null,
  windowSize: number,
) {
  const chartPoints: ChartPoint[] = []

  for (let index = windowSize - 1; index < points.length; index += 1) {
    const windowValues = points
      .slice(index - (windowSize - 1), index + 1)
      .map(selector)
      .filter((value): value is number => value !== null)

    const averageValue = getAverageValue(windowValues)

    if (averageValue === null) {
      continue
    }

    chartPoints.push({
      label: points[index].label,
      value: averageValue,
    })
  }

  return chartPoints
}

function buildTimeframeCharts(points: AggregatedPoint[], strategy: StrategyKey): TimeframeChartBundle {
  const scoreSelector = strategy === 'original'
    ? (point: AggregatedPoint) => point.originalStrategyScore
    : strategy === 'macd'
      ? (point: AggregatedPoint) => point.macdStrategyScore
      : (point: AggregatedPoint) => point.strategyThreeScore

  return {
    priceSeries: buildSeries(points, (point) => point.price),
    dailyMacdSeries: buildSeries(points, (point) => point.dailyMacd),
    weeklyMacdSeries: buildSeries(points, (point) => point.weeklyMacd),
    movingAverageDatasets: [
      {
        label: 'MA 50D',
        color: '#0d6efd',
        data: buildSeries(points, (point) => point.sma50),
      },
      {
        label: 'MA 100D',
        color: '#198754',
        data: buildSeries(points, (point) => point.sma100),
      },
      {
        label: 'MA 200D',
        color: '#fd7e14',
        data: buildSeries(points, (point) => point.sma200),
      },
    ],
    scoreSeries: buildSeries(points, scoreSelector),
    threeDayStrategySeries: buildRollingAverageSeries(points, scoreSelector, 3),
  }
}

function buildStrategyThreeTechnicalCharts(points: AggregatedPoint[]): StrategyThreeTechnicalChartBundle {
  const priceSeries = buildSeries(points, (point) => point.price)

  return {
    marketRegimeSeries: buildSeries(points, (point) => {
      switch (point.marketRegime) {
        case 'bull_quiet':
          return 3
        case 'bull_volatile':
          return 2
        case 'sideways_quiet':
          return 1
        case 'sideways_volatile':
          return 0
        case 'bear_quiet':
          return -2
        case 'bear_volatile':
          return -3
        default:
          return null
      }
    }),
    supportResistanceDatasets: [
      {
        label: 'Price',
        color: '#2563eb',
        data: priceSeries,
      },
      {
        label: 'Support',
        color: '#16a34a',
        data: buildSeries(points, (point) => point.support),
      },
      {
        label: 'Resistance',
        color: '#dc2626',
        data: buildSeries(points, (point) => point.resistance),
      },
    ],
    pivotDatasets: [
      {
        label: 'Price',
        color: '#2563eb',
        data: priceSeries,
      },
      {
        label: 'Pivot Middle',
        color: '#7c3aed',
        data: buildSeries(points, (point) => point.pivotClassicMiddle),
      },
      {
        label: 'Pivot S2',
        color: '#059669',
        data: buildSeries(points, (point) => point.pivotClassicS2),
      },
      {
        label: 'Pivot S3',
        color: '#10b981',
        data: buildSeries(points, (point) => point.pivotClassicS3),
      },
      {
        label: 'Pivot R2',
        color: '#ea580c',
        data: buildSeries(points, (point) => point.pivotClassicR2),
      },
      {
        label: 'Pivot R3',
        color: '#f97316',
        data: buildSeries(points, (point) => point.pivotClassicR3),
      },
    ],
    emaDatasets: [
      {
        label: 'Price',
        color: '#2563eb',
        data: priceSeries,
      },
      {
        label: 'EMA 20',
        color: '#14b8a6',
        data: buildSeries(points, (point) => point.ema20),
      },
      {
        label: 'EMA 50',
        color: '#0ea5e9',
        data: buildSeries(points, (point) => point.ema50),
      },
      {
        label: 'EMA 100',
        color: '#22c55e',
        data: buildSeries(points, (point) => point.ema100),
      },
      {
        label: 'EMA 200',
        color: '#f59e0b',
        data: buildSeries(points, (point) => point.ema200),
      },
    ],
    bollingerDatasets: [
      {
        label: 'Price',
        color: '#2563eb',
        data: priceSeries,
      },
      {
        label: 'BB Lower',
        color: '#0891b2',
        data: buildSeries(points, (point) => point.bollingerBandsLower),
      },
      {
        label: 'BB Upper',
        color: '#8b5cf6',
        data: buildSeries(points, (point) => point.bollingerBandsUpper),
      },
    ],
    adxDatasets: [
      {
        label: 'ADX',
        color: '#4f46e5',
        data: buildSeries(points, (point) => point.adx),
      },
      {
        label: '+DI',
        color: '#16a34a',
        data: buildSeries(points, (point) => point.adxDiPositive),
      },
      {
        label: '-DI',
        color: '#dc2626',
        data: buildSeries(points, (point) => point.adxDiNegative),
      },
    ],
    rsiDatasets: [
      {
        label: 'RSI',
        color: '#0f766e',
        data: buildSeries(points, (point) => point.rsi),
      },
      {
        label: 'Yesterday RSI',
        color: '#6d28d9',
        data: buildSeries(points, (point) => point.yesterdayRsi),
      },
      {
        label: 'Stoch RSI K',
        color: '#ea580c',
        data: buildSeries(points, (point) => point.stochRsiK),
      },
    ],
    macdHistogramDatasets: [
      {
        label: 'Daily MACD Histogram',
        color: '#16a34a',
        data: buildSeries(points, (point) => point.dailyMacd),
      },
      {
        label: 'Weekly MACD Histogram',
        color: '#dc2626',
        data: buildSeries(points, (point) => point.weeklyMacd),
      },
    ],
    macdVelocityDatasets: [
      {
        label: 'Daily MACD Velocity',
        color: '#14b8a6',
        data: buildSeries(points, (point) => point.dailyMacdVelocity),
      },
      {
        label: 'Weekly MACD Velocity',
        color: '#f97316',
        data: buildSeries(points, (point) => point.weeklyMacdVelocity),
      },
    ],
  }
}

function buildStreakLabel(streak: number) {
  if (streak > 0) {
    return `+${streak} days`
  }

  if (streak < 0) {
    return `${streak} days`
  }

  return '0 days'
}

function getScoreStreak(points: AggregatedPoint[], strategy: StrategyKey) {
  const selector = strategy === 'original'
    ? (point: AggregatedPoint) => point.originalStrategyScore
    : strategy === 'macd'
      ? (point: AggregatedPoint) => point.macdStrategyScore
      : (point: AggregatedPoint) => point.strategyThreeScore

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const currentValue = selector(points[index])

    if (currentValue === null || currentValue === 50) {
      continue
    }

    const isPositive = currentValue > 50
    let count = 0

    for (let innerIndex = index; innerIndex >= 0; innerIndex -= 1) {
      const value = selector(points[innerIndex])

      if (value === null || value === 50) {
        break
      }

      if ((isPositive && value > 50) || (!isPositive && value < 50)) {
        count += 1
        continue
      }

      break
    }

    return isPositive ? count : count * -1
  }

  return 0
}

function formatPriceValue(value: number) {
  return formatCurrency(
    value,
    Math.abs(value) >= 100 ? 2 : 4,
    Math.abs(value) >= 100 ? 2 : 4,
  )
}

function formatMacdValue(value: number) {
  return formatNumber(value, 4, 4)
}

function formatIndicatorValue(value: number) {
  return formatNumber(value, 2, 2)
}

function formatMarketRegimeLabel(value: string | null) {
  if (!value) {
    return 'N/A'
  }

  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatMarketRegimeValue(value: number) {
  switch (value) {
    case 3:
      return 'Bull Quiet'
    case 2:
      return 'Bull Volatile'
    case 1:
      return 'Sideways Quiet'
    case 0:
      return 'Sideways Volatile'
    case -2:
      return 'Bear Quiet'
    case -3:
      return 'Bear Volatile'
    default:
      return 'Unknown'
  }
}

function formatScoreValue(value: number) {
  return formatNumber(value, 0, 0)
}

function StrategyAccordionHeader({
  title,
  streak,
  previewData,
  color,
  datasetLabel,
}: {
  title: string
  streak: number
  previewData: ChartPoint[]
  color: string
  datasetLabel: string
}) {
  const streakClassName = streak > 0
    ? 'text-bg-success'
    : streak < 0
      ? 'text-bg-danger'
      : 'text-bg-secondary'

  return (
    <div className="d-flex align-items-center justify-content-between gap-3 w-100 pe-3 flex-wrap flex-md-nowrap">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="fw-semibold">{title}</span>
        <span className={`badge ${streakClassName}`}>{buildStreakLabel(streak)}</span>
      </div>

      <div style={{ width: 220, minWidth: 180, pointerEvents: 'none' }}>
        <TokenLineChart
          data={previewData}
          color={color}
          emptyMessage="No chart data."
          title={title}
          datasetLabel={datasetLabel}
          height={64}
          valueFormatter={formatScoreValue}
          showLegend={false}
          showTitle={false}
          showAxes={false}
          pointRadius={0}
          pointHoverRadius={0}
          borderWidth={2}
        />
      </div>
    </div>
  )
}

function StrategyTimeframeContent({
  title,
  timeframeSections,
  strategy,
}: {
  title: string
  timeframeSections: TimeframeSectionData[]
  strategy: StrategyKey
}) {
  return (
    <Accordion alwaysOpen className="d-flex flex-column gap-3">
      {timeframeSections.map((section) => {
        const charts = strategy === 'original'
          ? section.originalCharts
          : strategy === 'macd'
            ? section.macdCharts
            : section.strategyThreeCharts
        const strategyThreeTechnicalCharts = section.strategyThreeTechnicalCharts
        const scoreTitle = strategy === 'original'
          ? 'Original Strategy Score'
          : strategy === 'macd'
            ? 'MACD 3 Day Strategy Score'
            : 'Strategy 3 Score'
        const rollingScoreTitle = `3 ${section.label} Average ${scoreTitle}`
        const timeframeRegime = section.points[section.points.length - 1]?.marketRegime ?? null

        return (
          <Accordion.Item key={`${strategy}-${section.key}`} eventKey={`${strategy}-${section.key}`} className="shadow-sm border-0">
            <Accordion.Header>{section.label}</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-column gap-4">
                <TokenLineChart
                  data={charts.priceSeries}
                  color="#0d6efd"
                  emptyMessage={`No ${section.label.toLowerCase()} average price data available.`}
                  title="Average Price"
                  datasetLabel="Price"
                  height={320}
                  valueFormatter={formatPriceValue}
                />

                {strategy === 'strategy3' && (
                  <Accordion className="shadow-sm border-0">
                    <Accordion.Item eventKey={`technical-indicators-${section.key}`} className="border-0">
                      <Accordion.Header>Technical Indicators</Accordion.Header>
                      <Accordion.Body>
                        <div className="d-flex flex-column gap-4">
                          <div className="small text-muted">
                            Latest detected market regime for this timeframe:
                            <span className="fw-semibold text-body ms-1">
                              {formatMarketRegimeLabel(timeframeRegime)}
                            </span>
                          </div>

                          <TokenLineChart
                            data={strategyThreeTechnicalCharts.marketRegimeSeries}
                            color="#475569"
                            emptyMessage={`No ${section.label.toLowerCase()} market regime data available.`}
                            title="Average Market Regime"
                            datasetLabel="Market Regime"
                            height={320}
                            valueFormatter={formatMarketRegimeValue}
                            showZeroLine
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.supportResistanceDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} support and resistance data available.`}
                            title="Average Support, Resistance, and Price"
                            height={320}
                            valueFormatter={formatPriceValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.pivotDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} pivot data available.`}
                            title="Average Classic Pivot Levels and Price"
                            height={320}
                            valueFormatter={formatPriceValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.emaDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} EMA data available.`}
                            title="Average EMAs and Price"
                            height={320}
                            valueFormatter={formatPriceValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.bollingerDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} Bollinger band data available.`}
                            title="Average Bollinger Bands and Price"
                            height={320}
                            valueFormatter={formatPriceValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.adxDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} ADX data available.`}
                            title="Average ADX and Directional Indicators"
                            height={320}
                            valueFormatter={formatIndicatorValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.rsiDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} RSI data available.`}
                            title="Average RSI, Previous RSI, and Stoch RSI K"
                            height={320}
                            valueFormatter={formatIndicatorValue}
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.macdHistogramDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} MACD histogram data available.`}
                            title="Average Daily and Weekly MACD Histograms"
                            height={320}
                            valueFormatter={formatMacdValue}
                            showZeroLine
                          />

                          <TokenMultiLineChart
                            datasets={strategyThreeTechnicalCharts.macdVelocityDatasets}
                            emptyMessage={`No ${section.label.toLowerCase()} MACD velocity data available.`}
                            title="Average Daily and Weekly MACD Velocity"
                            height={320}
                            valueFormatter={formatMacdValue}
                            showZeroLine
                          />
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                )}

                {strategy !== 'strategy3' && (
                  <>
                    <TokenLineChart
                      data={charts.dailyMacdSeries}
                      color="#198754"
                      emptyMessage={`No ${section.label.toLowerCase()} daily MACD data available.`}
                      title="Average Daily MACD"
                      datasetLabel="Daily MACD"
                      height={320}
                      valueFormatter={formatMacdValue}
                      showZeroLine
                    />

                    <TokenLineChart
                      data={charts.weeklyMacdSeries}
                      color="#dc3545"
                      emptyMessage={`No ${section.label.toLowerCase()} weekly MACD data available.`}
                      title="Average Weekly MACD"
                      datasetLabel="Weekly MACD"
                      height={320}
                      valueFormatter={formatMacdValue}
                      showZeroLine
                    />

                    <TokenMultiLineChart
                      datasets={charts.movingAverageDatasets}
                      emptyMessage={`No ${section.label.toLowerCase()} moving average data available.`}
                      title="Average Moving Averages"
                      height={320}
                      valueFormatter={formatPriceValue}
                    />
                  </>
                )}
                
                <TokenLineChart
                  data={charts.scoreSeries}
                  color={strategy === 'original' ? '#6f42c1' : strategy === 'macd' ? '#fd7e14' : '#0f766e'}
                  emptyMessage={`No ${section.label.toLowerCase()} ${title.toLowerCase()} score data available.`}
                  title={`Average ${scoreTitle}`}
                  datasetLabel={scoreTitle}
                  height={320}
                  valueFormatter={formatScoreValue}
                  showZeroLine
                />

                <TokenLineChart
                  data={charts.threeDayStrategySeries}
                  color={strategy === 'original' ? '#8e44ad' : strategy === 'macd' ? '#ff922b' : '#14b8a6'}
                  emptyMessage={`Need at least 3 ${section.label.toLowerCase()} score points to chart ${rollingScoreTitle.toLowerCase()}.`}
                  title={rollingScoreTitle}
                  datasetLabel={rollingScoreTitle}
                  height={320}
                  valueFormatter={formatScoreValue}
                  showZeroLine
                />
              </div>
            </Accordion.Body>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
}

function TokenPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [rows, setRows] = useState<TokenHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        setLoading(true)
        setError('')

        const { data } = await api.get<StockDetailApiResponse>(`/token/${ticker}/`)

        if (!data.response.status) {
          throw new Error(data.response.message || 'Failed to fetch stock detail')
        }

        setRows(data.response.data.stock_data ?? [])
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to fetch stock detail'))
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      fetchStockDetail()
    }
  }, [ticker])

  const exchange = rows[0]?.exchange ?? ''
  const isCrypto = rows[0]?.screener?.toLowerCase() === 'crypto'
  const pageTitle = ticker?.toUpperCase() ?? 'Stock'

  const preparedRows = useMemo(() => prepareRows(rows, isCrypto), [rows, isCrypto])

  const timeframeSections = useMemo(() => {
    return TIMEFRAME_OPTIONS.map((timeframe) => {
      const points = aggregatePoints(preparedRows, timeframe.key)
      return {
        key: timeframe.key,
        label: timeframe.label,
        points,
        originalCharts: buildTimeframeCharts(points, 'original'),
        macdCharts: buildTimeframeCharts(points, 'macd'),
        strategyThreeCharts: buildTimeframeCharts(points, 'strategy3'),
        strategyThreeTechnicalCharts: buildStrategyThreeTechnicalCharts(points),
      }
    })
  }, [preparedRows])

  const dailyTimeframeSection = timeframeSections.find((section) => section.key === '1d') ?? null
  const dailyAveragePoints: PerformanceCalculatorDayPoint[] = dailyTimeframeSection
    ? dailyTimeframeSection.points.map((point) => ({
        dayKey: point.bucketKey,
        dayLabel: point.label,
        price: point.price,
        originalStrategyScore: point.originalStrategyScore,
        macdStrategyScore: point.macdStrategyScore,
        strategyThreeScore: point.strategyThreeScore,
      }))
    : []

  const originalPreviewData = dailyTimeframeSection?.originalCharts.scoreSeries ?? []
  const macdPreviewData = dailyTimeframeSection?.macdCharts.scoreSeries ?? []
  const strategyThreePreviewData = dailyTimeframeSection?.strategyThreeCharts.scoreSeries ?? []
  const originalStreak = dailyTimeframeSection ? getScoreStreak(dailyTimeframeSection.points, 'original') : 0
  const macdStreak = dailyTimeframeSection ? getScoreStreak(dailyTimeframeSection.points, 'macd') : 0
  const strategyThreeStreak = dailyTimeframeSection ? getScoreStreak(dailyTimeframeSection.points, 'strategy3') : 0

  return (
    <>
      <AppNavbar />

      <div className="container-fluid py-4 px-3 px-md-4">
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h1 className="display-6 fw-bold mb-1">{pageTitle}</h1>
                  {ticker && exchange && (
                    <a
                      href={`https://www.tradingview.com/chart/Uy07wzBL/?symbol=${exchange}%3A${ticker.toUpperCase()}`}
                      className="text-danger text-decoration-none fs-5"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${ticker.toUpperCase()} on TradingView`}
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                    </a>
                  )}
                </div>
              </div>

              <div className="d-flex gap-2 align-items-center">
                {exchange && <span className="badge text-bg-secondary">{exchange}</span>}
              </div>
            </div>

            {loading && (
              <div className="card border-0 shadow-sm">
                <div className="card-body py-5 text-center">
                  <div className="spinner-border" role="status" aria-hidden="true"></div>
                  <p className="mt-3 mb-0 text-muted">Loading stock detail...</p>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && (
              <Accordion alwaysOpen className="d-flex flex-column gap-3">
                <Accordion.Item eventKey="performance" className="shadow-sm border-0">
                  <Accordion.Header>Performance calculator</Accordion.Header>
                  <Accordion.Body>
                    <PerformanceCalculator dailyPoints={dailyAveragePoints} />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="original-strategy" className="shadow-sm border-0">
                  <Accordion.Header>
                    <StrategyAccordionHeader
                      title="Original strategy"
                      streak={originalStreak}
                      previewData={originalPreviewData}
                      color="#6f42c1"
                      datasetLabel="Original Strategy Score"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <StrategyTimeframeContent
                      title="Original strategy"
                      timeframeSections={timeframeSections}
                      strategy="original"
                    />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="macd-strategy" className="shadow-sm border-0">
                  <Accordion.Header>
                    <StrategyAccordionHeader
                      title="MACD 3 day strategy"
                      streak={macdStreak}
                      previewData={macdPreviewData}
                      color="#fd7e14"
                      datasetLabel="MACD 3 Day Strategy Score"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <StrategyTimeframeContent
                      title="MACD 3 day strategy"
                      timeframeSections={timeframeSections}
                      strategy="macd"
                    />
                  </Accordion.Body>
                </Accordion.Item>

                <div className="d-none">
                  <Accordion.Item eventKey="score-validation" className="shadow-sm border-0">
                    <Accordion.Header>Score Validation</Accordion.Header>
                    <Accordion.Body>
                      <ScoreValidationStudy dailyPoints={dailyAveragePoints} />
                    </Accordion.Body>
                  </Accordion.Item>
                </div>

                <Accordion.Item eventKey="strategy-three" className="shadow-sm border-0">
                  <Accordion.Header>
                    <StrategyAccordionHeader
                      title="Strategy 3"
                      streak={strategyThreeStreak}
                      previewData={strategyThreePreviewData}
                      color="#0f766e"
                      datasetLabel="Strategy 3 Score"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <StrategyTimeframeContent
                      title="Strategy 3"
                      timeframeSections={timeframeSections}
                      strategy="strategy3"
                    />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="history" className="shadow-sm border-0">
                  <Accordion.Header>History</Accordion.Header>
                  <Accordion.Body className="p-0">
                    <TokenHistoryTable rows={rows} />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="tradingview" className="shadow-sm border-0">
                  <Accordion.Header>TradingView Chart</Accordion.Header>
                  <Accordion.Body>
                    {ticker && exchange ? (
                      <TradingViewWidget ticker={ticker.toUpperCase()} exchange={exchange} />
                    ) : (
                      <div className="text-muted">No chart data available.</div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default TokenPage








