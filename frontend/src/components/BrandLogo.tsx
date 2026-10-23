import { useState } from 'react'

/**
 * Company logo. Drop the real logo file at `public/brand/m3m-logo.png`
 * and it is picked up automatically; until then a text placeholder shows.
 */
export default function BrandLogo({ className = 'h-10' }: { className?: string }) {
  const [missing, setMissing] = useState(false)

  if (!missing) {
    return (
      <img
        src="/brand/m3m-logo.png"
        alt="M3M"
        className={`${className} w-auto object-contain`}
        onError={() => setMissing(true)}
      />
    )
  }

  return (
    <div className="flex flex-col leading-none select-none" aria-label="M3M">
      <span className="text-3xl font-extrabold tracking-tight">
        <span className="text-brand-green">M</span>
        <span className="text-brand-blue">3M</span>
      </span>
      <span className="mt-0.5 text-[8px] text-gray-600">Our Expertise. Your Joy.</span>
    </div>
  )
}
