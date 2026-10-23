/* Small shared app components that mirror the original's custom pieces. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, LogOut } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Original "Su" button: shows a spinner + loadingText while `loading`. */
export function LoadingButton({
  title,
  loading,
  handleClick,
  type = 'button',
  className = '',
  variant,
  loadingText = 'Submitting',
  disabled = false,
  children,
  ...rest
}: Omit<ButtonProps, 'title'> & {
  title?: ReactNode
  loading?: boolean
  handleClick?: () => void
  loadingText?: string
}) {
  return (
    <Button
      disabled={loading || disabled}
      type={type}
      onClick={handleClick}
      className={cn('cursor-pointer', className)}
      variant={variant}
      onKeyDown={(e) => e.key === 'Enter' && handleClick?.()}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" /> {loadingText}
        </>
      ) : (
        (title ?? children)
      )}
    </Button>
  )
}

/** 404 page (identical copy and styling to original). */
export function NotFound() {
  return (
    <main className="grid min-h-[calc(100dvh_-_210px)] place-items-center bg-white px-6 py-24 sm:py-16 rounded-md lg:px-8 mt-2">
      <div className="text-center">
        <p className="text-base font-semibold text-[var(--mainTheamColor)]">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">Page not found</h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">Sorry, we couldn’t find the Page you’re looking for.</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            to="/dashboard"
            className="rounded-md bg-[var(--mainTheamColor)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[var(--mainTheamColor)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mainTheamColor)]"
          >
            Go back home
          </Link>
        </div>
      </div>
    </main>
  )
}

/** Error state with "Go Back To Dashbord" button (original spelling kept). */
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh_-_200px)] gap-5">
      <div className="text-red-500 text-2xl">{message}</div>
      <Button variant="btnBlue" asChild>
        <Link to="/dashboard">
          Go Back To Dashbord <LogOut />
        </Link>
      </Button>
    </div>
  )
}
