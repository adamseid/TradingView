import { useState } from 'react'
import TokenLineChart from './TokenLineChart'
import { formatCurrency, formatNumber } from '../utils/formatters'

export interface PerformanceCalculatorDayPoint {
  dayKey: string
  dayLabel: string
  price: number | null
  strategyOneScore: number | null
  strategyTwoScore: number | null
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

interface SimulationResult {
  rows: SimulationRow[]
  chartData: Array<{ label: string; value: number }>
}

const POSITIVE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
const NEGATIVE_LEVELS = [-1, -2, -3, -4, -5, -6, -7, -8, -9] as const

function buildDefaultAllocationMap() {
  return {
    standard: '50',
    dca: '10',
    positive: {
      1: '45',
      2: '40',
      3: '35',
      4: '30',
      5: '25',
      6: '20',
      7: '15',
      8: '10',
      9: '5',
    } as Record<number, string>,
    negative: {
      [-1]: '55',
      [-2]: '60',
      [-3]: '65',
      [-4]: '70',
      [-5]: '75',
      [-6]: '80',
      [-7]: '85',
      [-8]: '90',
      [-9]: '95',
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
  const scoreOne = dayPoint.strategyOneScore
  const scoreTwo = dayPoint.strategyTwoScore

  if (strategy === 'strategy1') {
    return scoreOne ?? 0
  }

  if (strategy === 'strategy2') {
    return scoreTwo ?? 0
  }

  if (scoreOne !== null && scoreTwo !== null) {
    return (scoreOne + scoreTwo) / 2
  }

  return scoreOne ?? scoreTwo ?? 0
}

function clampScoreToBucket(score: number) {
  return Math.max(-9, Math.min(9, Math.round(score)))
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

function buildTargetCashAllocation(
  scoreBucket: number,
  standardCashAllocation: number,
  positiveAllocations: Record<number, string>,
  negativeAllocations: Record<number, string>,
) {
  if (scoreBucket > 0) {
    return parsePercentage(positiveAllocations[scoreBucket] ?? `${standardCashAllocation}`)
  }

  if (scoreBucket < 0) {
    return parsePercentage(negativeAllocations[scoreBucket] ?? `${standardCashAllocation}`)
  }

  return standardCashAllocation
}

function PerformanceCalculator({ dailyPoints }: PerformanceCalculatorProps) {
  const defaultAllocations = buildDefaultAllocationMap()
  const [initialInvestment, setInitialInvestment] = useState('1000')
  const [recurringDeposit, setRecurringDeposit] = useState('0')
  const [depositFrequency, setDepositFrequency] = useState<DepositFrequency>('weekly')
  const [standardCashAllocation, setStandardCashAllocation] = useState(defaultAllocations.standard)
  const [dcaPercent, setDcaPercent] = useState(defaultAllocations.dca)
  const [positiveAllocations, setPositiveAllocations] = useState(defaultAllocations.positive)
  const [negativeAllocations, setNegativeAllocations] = useState(defaultAllocations.negative)
  const [strategy, setStrategy] = useState<StrategyOption>('strategy1')
  const [result, setResult] = useState<SimulationResult | null>(null)

  const sortedDailyPoints = [...dailyPoints]
    .filter((point): point is PerformanceCalculatorDayPoint & { price: number } => point.price !== null)
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))

  const handlePositiveAllocationChange = (level: number, value: string) => {
    setPositiveAllocations((current) => ({
      ...current,
      [level]: value,
    }))
  }

  const handleNegativeAllocationChange = (level: number, value: string) => {
    setNegativeAllocations((current) => ({
      ...current,
      [level]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startingCash = parseAmount(initialInvestment)
    const recurringDepositAmount = parseAmount(recurringDeposit)
    const neutralCashAllocation = parsePercentage(standardCashAllocation)
    const maxDailyTradePercent = parsePercentage(dcaPercent)

    let cash = startingCash
    let shares = 0
    let previousPortfolioValue = startingCash
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
        cash += depositApplied
        lastDepositDate = currentDate
      }

      const strategyScore = resolveStrategyScore(dayPoint, strategy)
      const scoreBucket = clampScoreToBucket(strategyScore)
      const targetCashAllocation = buildTargetCashAllocation(
        scoreBucket,
        neutralCashAllocation,
        positiveAllocations,
        negativeAllocations,
      )

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

    setResult({
      rows,
      chartData: rows.map((row) => ({
        label: row.date,
        value: row.portfolioValue,
      })),
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

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="standard-cash-allocation" className="form-label">Standard cash allocation (%)</label>
            <input
              id="standard-cash-allocation"
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="form-control"
              value={standardCashAllocation}
              onChange={(event) => setStandardCashAllocation(event.target.value)}
            />
          </div>

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
        </div>

        <div className="row g-3">
          {POSITIVE_LEVELS.slice(0, 5).map((level) => (
            <div className="col-6 col-md" key={`positive-${level}`}>
              <label htmlFor={`positive-${level}`} className="form-label">{`+${level} allocation`}</label>
              <input
                id={`positive-${level}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={positiveAllocations[level]}
                onChange={(event) => handlePositiveAllocationChange(level, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="row g-3">
          {POSITIVE_LEVELS.slice(5).map((level) => (
            <div className="col-6 col-md-3" key={`positive-${level}`}>
              <label htmlFor={`positive-${level}`} className="form-label">{`+${level} allocation`}</label>
              <input
                id={`positive-${level}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={positiveAllocations[level]}
                onChange={(event) => handlePositiveAllocationChange(level, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="row g-3">
          {NEGATIVE_LEVELS.slice(0, 5).map((level) => (
            <div className="col-6 col-md" key={`negative-${level}`}>
              <label htmlFor={`negative-${level}`} className="form-label">{`${level} allocation`}</label>
              <input
                id={`negative-${level}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={negativeAllocations[level]}
                onChange={(event) => handleNegativeAllocationChange(level, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="row g-3">
          {NEGATIVE_LEVELS.slice(5).map((level) => (
            <div className="col-6 col-md-3" key={`negative-${level}`}>
              <label htmlFor={`negative-${level}`} className="form-label">{`${level} allocation`}</label>
              <input
                id={`negative-${level}`}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-control"
                value={negativeAllocations[level]}
                onChange={(event) => handleNegativeAllocationChange(level, event.target.value)}
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
              <option value="strategy1">Strategy 1</option>
              <option value="strategy2">Strategy 2</option>
              <option value="average">Average of Strategy 1 and 2</option>
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
                      No daily median data available for this calculator.
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row) => (
                    <tr key={row.date}>
                      <td className="text-nowrap">{row.date}</td>
                      <td className="text-nowrap">{formatCurrency(row.price)}</td>
                      <td className="text-nowrap">{formatNumber(row.strategyScore, 2, 2)}</td>
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
