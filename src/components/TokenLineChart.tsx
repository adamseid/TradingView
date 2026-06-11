import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

interface ChartPoint {
  label: string
  value: number
}

interface TokenLineChartProps {
  data: ChartPoint[]
  color: string
  emptyMessage: string
  title: string
  datasetLabel: string
  height?: number
  valueFormatter?: (value: number) => string
  showZeroLine?: boolean
}

function defaultValueFormatter(value: number) {
  return value.toFixed(3)
}

function hexToRgba(hex: string, alpha: number) {
  const normalizedHex = hex.replace('#', '')
  const safeHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalizedHex

  const red = Number.parseInt(safeHex.slice(0, 2), 16)
  const green = Number.parseInt(safeHex.slice(2, 4), 16)
  const blue = Number.parseInt(safeHex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function TokenLineChart({
  data,
  color,
  emptyMessage,
  title,
  datasetLabel,
  height = 280,
  valueFormatter = defaultValueFormatter,
  showZeroLine = false,
}: TokenLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart<'line'> | null>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) {
      return undefined
    }

    chartRef.current?.destroy()

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((point) => point.label),
        datasets: [
          {
            label: datasetLabel,
            data: data.map((point) => point.value),
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.2),
            pointBackgroundColor: color,
            pointBorderColor: color,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: color,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBorderWidth: 2,
            borderWidth: 3,
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: title,
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${datasetLabel}: ${valueFormatter(context.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              callback: (tickValue) => valueFormatter(Number(tickValue)),
            },
            grid: {
              color: (context) => {
                const tickValue = Number(context.tick.value)

                if (showZeroLine && tickValue === 0) {
                  return 'rgba(220, 53, 69, 0.45)'
                }

                return 'rgba(108, 117, 125, 0.18)'
              },
              lineWidth: (context) => {
                const tickValue = Number(context.tick.value)
                return showZeroLine && tickValue === 0 ? 2 : 1
              },
            },
          },
        },
      },
    })

    chartRef.current = chart

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [color, data, datasetLabel, showZeroLine, title, valueFormatter])

  if (data.length === 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-muted small rounded border bg-body-tertiary px-3"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export default TokenLineChart
