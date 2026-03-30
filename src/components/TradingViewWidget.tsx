import { useEffect, useRef } from 'react'

interface TradingViewWidgetProps {
  ticker: string
  exchange: string
}

function TradingViewWidget({ ticker, exchange }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = 'calc(100% - 32px)'
    widget.style.width = '100%'

    const copyright = document.createElement('div')
    copyright.className = 'tradingview-widget-copyright'
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `${exchange}:${ticker}`,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      studies: ['STD;MACD', 'STD;MA%Ribbon', 'STD;RSI'],
      support_host: 'https://www.tradingview.com',
    })

    widgetContainer.appendChild(widget)
    widgetContainer.appendChild(copyright)
    widgetContainer.appendChild(script)
    containerRef.current.appendChild(widgetContainer)
  }, [ticker, exchange])

  return (
    <div
      ref={containerRef}
      className="border rounded overflow-hidden bg-dark"
      style={{ height: 800 }}
    />
  )
}

export default TradingViewWidget