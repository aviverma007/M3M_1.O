import { useEffect, useState } from 'react'

/** Debounced copy of a value (original useDebounce, default 500ms). */
export function useDebounce<T>(value: T, delay = 500) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
