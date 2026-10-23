import { useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { BuildingIcon, CheckIcon, GridIcon, HomeIcon } from '../components/icons'
import { usePortfolio } from '../portfolio/PortfolioContext'
import { PORTFOLIOS, type Portfolio, type PortfolioId } from '../portfolio/portfolios'

const ICONS: Record<Portfolio['icon'], typeof BuildingIcon> = {
  building: BuildingIcon,
  grid: GridIcon,
  home: HomeIcon,
}

export default function SelectPortfolioPage() {
  const { portfolio, selectPortfolio } = usePortfolio()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<PortfolioId>(portfolio?.id ?? PORTFOLIOS[0].id)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleNext() {
    selectPortfolio(selected)
    navigate('/dashboard', { replace: true })
  }

  // Arrow-key navigation within the radio group
  function handleKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + PORTFOLIOS.length) % PORTFOLIOS.length
    setSelected(PORTFOLIOS[next].id)
    cardRefs.current[next]?.focus()
  }

  return (
    <div className="min-h-full bg-[#f0f1f4] px-4 py-6 sm:px-8">
      <p className="text-[16px] font-semibold text-gray-600">M3M India</p>

      <main className="mx-auto mt-4 max-w-[1440px] rounded-2xl bg-white px-5 pt-8 pb-12 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:-mt-2 sm:px-10 lg:px-[60px]">
        <div className="flex justify-center sm:justify-start">
          <BrandLogo className="h-12" />
        </div>

        <div className="mx-auto mt-6 h-1.5 w-20 rounded-full bg-accent sm:-mt-6" />

        <header className="mx-auto mt-9 max-w-3xl text-center">
          <h1 className="text-[30px] font-black tracking-tight text-ink sm:text-[44px]">Select Project Portfolio</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-gray-500 sm:text-[22px]">
            Choose the portfolio you want to work with. You can switch this later from the header.
          </p>
        </header>

        <div
          role="radiogroup"
          aria-label="Project portfolio"
          className="mt-12 grid gap-6 sm:mt-20 md:grid-cols-3 md:gap-10"
        >
          {PORTFOLIOS.map((p, i) => {
            const Icon = ICONS[p.icon]
            const isSelected = p.id === selected
            return (
              <button
                key={p.id}
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelected(p.id)}
                onDoubleClick={handleNext}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={`relative flex flex-col items-center rounded-2xl border-2 bg-white px-6 py-12 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-accent/25 ${
                  isSelected
                    ? 'border-accent'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                )}

                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl text-icon transition ${
                    isSelected ? 'bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-gray-100' : 'bg-tile'
                  }`}
                >
                  <Icon className="h-7 w-7" />
                </span>

                <span className="mt-8 text-[24px] font-bold text-ink">{p.name}</span>
                <span className="mt-2 text-[17px] font-semibold text-gray-400">{p.tagline}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-14 flex justify-center sm:mt-20">
          <button
            type="button"
            onClick={handleNext}
            className="w-full max-w-[386px] rounded-2xl bg-cta py-5 text-[24px] font-extrabold tracking-wide text-white shadow-[0_6px_16px_rgba(0,166,62,0.3)] transition hover:bg-cta-hover active:translate-y-px"
          >
            NEXT
          </button>
        </div>
      </main>
    </div>
  )
}
