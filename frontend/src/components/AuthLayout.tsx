import type { ReactNode } from 'react'
import SkylineBackground from './SkylineBackground'
import BrandLogo from './BrandLogo'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared shell for Login / Forgot Password: skyline backdrop + centred card. */
export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-page px-4 py-10">
      <SkylineBackground />

      <section className="relative z-10 w-full max-w-[532px] rounded-2xl border border-gray-200 bg-white px-5 pt-8 pb-8 shadow-sm sm:px-8 sm:pt-12">
        {/* logo: in-flow on phones, pinned top-left on wider screens */}
        <div className="mb-4 flex justify-center sm:absolute sm:top-12 sm:left-5 sm:mb-0 sm:block">
          <BrandLogo className="h-10" />
        </div>

        <header className="text-center sm:mt-6">
          <h1 className="text-[22px] font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-[16px] text-gray-500">{subtitle}</p>}
        </header>

        <div className="mt-7">{children}</div>
      </section>
    </main>
  )
}
