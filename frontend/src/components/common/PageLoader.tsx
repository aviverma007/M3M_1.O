import { memo } from 'react'
import { Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Full-area spinner (same as original: lucide Loader, 44px, #0b0a57). */
const PageLoader = memo(({ className }: { className?: string }) => (
  <div className={cn('absolute left-1/2 top-1/2 animate-spin z-50', className)}>
    <Loader size={44} color="#0b0a57" />
  </div>
))
export default PageLoader

export const SmallLoader = memo(() => (
  <div className="absolute left-1/2 top-1/2 animate-spin inline-block size-9 border-3 border-current border-t-transparent text-blue-900 rounded-full">
    <span className="sr-only">Loading...</span>
  </div>
))
