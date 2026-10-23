import type { ReactNode } from 'react'
import { isMockUpload, openUploadedFile } from '@/api/design-brief'

type Props = { href: string; mode: 'view' | 'download'; className?: string; title?: string; children: ReactNode }

/** <a> to an uploaded file. Mock uploads (stored in the browser) are opened/downloaded from the mock store. */
export default function FileLink({ href, mode, className, title, children }: Props) {
  const mock = isMockUpload(href)
  return (
    <a
      href={href}
      {...(mode === 'view' ? { target: '_blank', rel: 'noopener noreferrer' } : { download: true })}
      className={className}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        if (!mock) return
        e.preventDefault()
        openUploadedFile(href, mode)
      }}
    >
      {children}
    </a>
  )
}
