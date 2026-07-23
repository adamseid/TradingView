import { useState } from 'react'
import TokenLineChart from './TokenLineChart'
import { formatCurrency, formatNumber } from '../utils/formatters'

export interface PerformanceCalculatorDayPoint {
  dayKey: string
  dayLabel: string
  price: number | null
  originalStrategyScore: number | null
  macdStrategyScore: number | null
}

type DepositFrequency = 'daily' | 'weekly' | 'monthly'
type StrategyOption = 'strategy1' | 'strategy2' | 'average'

interface PerformanceCalculatorProps {
  dailyPoints: PerformanceCalculatorDayPoint[]
}

interface SimulationRow {
  date: string
  price: number
  strategyScore: number
  tradeAmount: number
  dailyProfit: number
  portfolioValue: number
}

interface SimulationSummary {
  strategyProfitPercent: number | null
  priceIncreasePercent: number | null
}

interface SimulationResult {
  rows: SimulationRow[]
  chartData: Array<{ label: string; value: number }>
  summary: SimulationSummary
}

const SCORE_BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const

function buildDefaultAllocationMap() {
  return {
    dca: '10',
    allocations: {
      0: '95',
      10: '85',
      20: '75',
      30: '65',
      40: '55',
      50: '50',
      60: '45',
      70: '35',
      80: '25',
      90: '15',
      100: '5',
    } as Record<number, string>,
  }
}

function parsePercentage(value: string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(100, Math.max(0, numericValue))
}

function parseAmount(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0
}

function resolveStrategyScore(
  dayPoint: PerformanceCalculatorDayPoint,
  strategy: StrategyOption,
) {
  const originalScore = dayPoint.originalStrategyScore
  const macdScore = dayPoint.macdStrategyScore

  if (strategy === 'strategy1') {
    return originalScore ?? 50
  }

  if (strategy === 'strategy2') {
    return macdScore ?? 50
  }

  if (originalScore !== null && macdScore !== null) {
    return (originalScore + macdScore) / 2
  }

  return originalScore ?? macdScore ?? 50
}

function clampScoreToBucket(score: number) {
  return Math.max(0, Math.min(100, Math.round(score / 10) * 10))
}

function parseDay(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function shouldApplyRecurringDeposit(
  currentDate: Date,
  frequency: DepositFrequency,
  lastDepositDate: Date | null,
) {
  if (lastDepositDate === null) {
    return false
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const dayDifference = Math.floor(
    (currentDate.getTime() - lastDepositDate.getTime()) / millisecondsPerDay,
  )

  if (frequency === 'daily') {
    return dayDifference >= 1
  }

  if (frequency === 'weekly') {
    return dayDifference >= 7
  }

  return (
    currentDate.getFullYear() !== lastDepositDate.getFullYear()
    || currentDate.getMonth() !== lastDepositDate.getMonth()
  )
}

function buildTargetCashAllocation(scoreBucket: number, allocations: Record<number, string>) {
  return parsePercentage(allocations[scoreBucket] ?? '50')
}

function getPercentClassName(value: number | null) {
  if (value === null || value === 0) {
    return 'text-body'
  }

  return value > 0 ? 'text-success' : 'text-danger'
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return 'N/A'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatNumber(value, 2, 2)}%`
}

function PerformanceCalculator({ dailyPoints }: PerformanceCalculatorProps) {
  const defaultAllocations = buildDefaultAllocationMap()
  const [initialInvestment, setInitialInvestment] = useState('1000')
  const [recurringDeposit, setRecurringDeposit] = useState('0')
  const [depositFrequency, setDepositFrequency] = useState<DepositFrequency>('weekly')
  const [dcaPercent, setDcaPercent] = useState(defaultAllocations.dca)
  const [allocations, setAllocations] = useState(defaultAllocations.allocations)
  const [strategy, setStrategy] = useState<StrategyOption>('strategy1')
  const [result, setResult] = useState<SimulationResult | null>(null)

  const sortedDailyPoints = [...dailyPoints]
    .filter((point): point is PerformanceCalculatorDayPoint & { price: number } => point.price !== null)
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))

  const handleAllocationChange = (scoreBucket: number, value: string) => {
    setAllocations((current) => ({
      ...current,
      [scoreBucket]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startingCash = parseAmount(initialInvestment)
    const recurringDepositAmount = parseAmount(recurringDeposit)
    const maxDailyTradePercent = parsePercentage(dcaPercent)

    let cash = startingCash
    let shares = 0
    let previousPortfolioValue = startingCash
    let totalDeposits = 0
    let lastDepositDate = sortedDailyPoints.length > 0 ? parseDay(sortedDailyPoints[0].dayKey) : null

    const rows: SimulationRow[] = []

    sortedDailyPoints.forEach((dayPoint) => {
      const currentDate = parseDay(dayPoint.dayKey)

      if (!currentDate) {
        return
      }

      let depositApplied = 0

      if (
        recurringDepositAmount > 0
        && shouldApplyRecurringDeposit(currentDate, depositFrequency, lastDepositDate)
      ) {
        depositApplied = recurringDepositAmount
        totalDeposits += depositApplied
        cash += depositApplied
        lastDepositDate = currentDate
      }

      const strategyScore = resolveStrategyScore(dayPoint, strategy)
      const scoreBucket = clampScoreToBucket(strategyScore)
      const targetCashAllocation = buildTargetCashAllocation(scoreBucket, allocations)

      const portfolioValueBeforeTrade = cash + (shares * dayPoint.price)
      const targetCashValue = portfolioValueBeforeTrade * (targetCashAllocation / 100)
      const tradeLimit = portfolioValueBeforeTrade * (maxDailyTradePercent / 100)

      let tradeAmount = 0

      if (tradeLimit > 0) {
        const cashDeltaNeeded = targetCashValue - cash

        if (cashDeltaNeeded < 0) {
          const buyAmount = Math.min(Math.abs(cashDeltaNeeded), tradeLimit, cash)

          if (buyAmount > 0) {
            shares += buyAmount / dayPoint.price
            cash -= buyAmount
            tradeAmount = -buyAmount
          }
        } else if (cashDeltaNeeded > 0) {
          const sellAmount = Math.min(cashDeltaNeeded, tradeLimit, shares * dayPoint.price)

          if (sellAmount > 0) {
            shares -= sellAmount / dayPoint.price
            cash += sellAmount
            tradeAmount = sellAmount
          }
        }
      }

      const portfolioValue = cash + (shares * dayPoint.price)
      const dailyProfit = rows.length === 0
        ? portfolioValue - startingCash - depositApplied
        : portfolioValue - previousPortfolioValue - depositApplied

      previousPortfolioValue = portfolioValue

      rows.push({
        date: dayPoint.dayLabel,
        price: dayPoint.price,
        strategyScore,
        tradeAmount,
        dailyProfit,
        portfolioValue,
      })
    })

    const firstPrice = rows[0]?.price ?? null
    const finalPrice = rows[rows.length - 1]?.price ?? null
    const finalPortfolioValue = rows[rows.length - 1]?.portfolioValue ?? startingCash
    const totalContributions = startingCash + totalDeposits

    const strategyProfitPercent = totalContributions > 0
      ? ((finalPortfolioValue - totalContributions) / totalContributions) * 100
      : null

    const priceIncreasePercent = firstPrice && finalPrice
      ? ((finalPrice - firstPrice) / firstPrice) * 100
      : null

    setResult({
      rows,
      chartData: rows.map((row) => ({
        label: row.date,
        value: row.portfolioValue,
      })),
      summary: {
        strategyProfitPercent,
        priceIncreasePercent,
      },
    })
  }

  return (
    <div className="d-flex flex-column gap-4">
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label htmlFor="initial-investment" className="form-label">Initial investment</label>
            <input
              id="initial-investment"
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={initialInvestment}
              onChange={(event) => setInitialInvestment(event.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="recurring-deposit" className="form-label">Recurring deposits</label>
            <input
              id="recurring-deposit"
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={recurringDeposit}
              onChange={(event) => setRecurringDeposit(event.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="deposit-frequency" className="form-label">Deposit frequency</label>
            <select
              id="deposit-frequency"
              className="form-select"
              value={depositFrequency}
              onChange={(event) => setDepositFrequency(event.target.value as DepositFrequency)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label htmlFor="dca-percent" className="form-label">DCA (%)</label>
            <input
              id="dca-percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="form-control"
              value={dcaPercent}
              onChange={(event) => setDcaPercent(event.target.value)}
            />
          </div>

          <div className="col-12 col-md-6">
            <div className="small text-muted border rounded bg-body-tertiary px-3 py-2">
              Score 50 is neutral. Scores are rounded to the nearest 10-point cash-allocation bucket.
            </div>
          </div>
        </div>

        <div className="row g-3">
          {SCORE_BUCKETS.slice(0, 6).map((scoreBucket) => (
            <div className="col-6 col-md" key={`allocation-${scoreBucket}`}>
              <label htmlFor={`allocation-${scoreBucket}`} className="form-label">{`Score ${scoreBucket} allocation (%)`}</label>
              <input
                id={`allocation-${scoreBucket}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={allocations[scoreBucket]}
                onChange={(event) => handleAllocationChange(scoreBucket, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="row g-3">
          {SCORE_BUCKETS.slice(6).map((scoreBucket) => (
            <div className="col-6 col-md" key={`allocation-${scoreBucket}`}>
              <label htmlFor={`allocation-${scoreBucket}`} className="form-label">{`Score ${scoreBucket} allocation (%)`}</label>
              <input
                id={`allocation-${scoreBucket}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={allocations[scoreBucket]}
                onChange={(event) => handleAllocationChange(scoreBucket, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-8">
            <label htmlFor="strategy-select" className="form-label">Strategy</label>
            <select
              id="strategy-select"
              className="form-select"
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as StrategyOption)}
            >
              <option value="strategy1">Original strategy</option>
              <option value="strategy2">MACD 3 day strategy</option>
              <option value="average">Average of original and MACD 3 day strategy</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <button type="submit" className="btn btn-primary w-100">
              Calculate performance
            </button>
          </div>
        </div>
      </form>

      {result && (
        <div className="d-flex flex-column gap-4">
          <p className="mb-0 small text-body-secondary">
            This strategy had{' '}
            <span className={`fw-semibold ${getPercentClassName(result.summary.strategyProfitPercent)}`}>
              {formatSignedPercent(result.summary.strategyProfitPercent)}
            </span>{' '}
            profit. The stock price increased by{' '}
            <span className={`fw-semibold ${getPercentClassName(result.summary.priceIncreasePercent)}`}>
              {formatSignedPercent(result.summary.priceIncreasePercent)}
            </span>{' '}
            from the date of tracking.
          </p>

          <TokenLineChart
            data={result.chartData}
            color="#0d6efd"
            emptyMessage="No portfolio data available."
            title="Portfolio Value"
            datasetLabel="Portfolio"
            height={320}
            valueFormatter={(value) => formatCurrency(value)}
          />

          <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="table table-hover table-bordered align-middle w-100 mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th scope="col" className="text-nowrap">Date</th>
                  <th scope="col" className="text-nowrap">Price</th>
                  <th scope="col" className="text-nowrap">Strategy score</th>
                  <th scope="col" className="text-nowrap">Invested / sold</th>
                  <th scope="col" className="text-nowrap">Daily profit</th>
                </tr>
              </thead>

              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No daily average data available for this calculator.
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row) => (
                    <tr key={row.date}>
                      <td className="text-nowrap">{row.date}</td>
                      <td className="text-nowrap">{formatCurrency(row.price)}</td>
                      <td className="text-nowrap">{formatNumber(row.strategyScore, 0, 2)}</td>
                      <td className="text-nowrap">{formatCurrency(row.tradeAmount)}</td>
                      <td className="text-nowrap">{formatCurrency(row.dailyProfit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceCalculator
