/*
 * ?focus=<field label> on any page: once the page has rendered, scroll to the field with that label and flash it.
 * Used by the Portfolio page's links ("Floor to Floor Height Apt 3450 m vs 3 to 3.15" -> Module 6, that field).
 * Collapsed sections ("Cluster level Parameters" …) are opened when the field isn't visible yet.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const SECTION_TOGGLES = /^(area statement|additional elements( 2\/2)?|cluster level parameters|club & amenities|key ratio)$/i

function findField(target: string): HTMLElement | null {
  const t = norm(target)
  if (!t) return null
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('main label, main span, main p, main td, main th, main h3, main h4, main div, label, td, th, p, span'))
    .filter((el) => el.offsetParent !== null && el.children.length <= 3 && (el.textContent ?? '').length < 160)
    .filter((el) => !el.closest('header, nav, [data-sonner-toaster]'))
  let best: { el: HTMLElement; score: number } | null = null
  for (const el of nodes) {
    const txt = norm(el.textContent ?? '')
    if (!txt) continue
    const score = txt === t ? 0 : txt.startsWith(t) ? 1 : t.startsWith(txt) && txt.length > 6 ? 2 : txt.includes(t) ? 3 : -1
    if (score < 0) continue
    if (!best || score < best.score || (score === best.score && (el.textContent ?? '').length < (best.el.textContent ?? '').length)) best = { el, score }
  }
  return best?.el ?? null
}

function flash(el: HTMLElement) {
  // highlight the label's row / field container
  const box = (el.closest('tr, [class*="space-y"], [class*="grid"] > div') as HTMLElement | null) ?? el
  box.scrollIntoView({ behavior: 'smooth', block: 'center' })
  box.classList.add('focus-flash')
  const input = box.querySelector<HTMLInputElement>('input, select, textarea, button[role="combobox"]')
  setTimeout(() => input?.focus({ preventScroll: true }), 700)
  setTimeout(() => box.classList.remove('focus-flash'), 4200)
}

export default function FocusFromUrl() {
  const { search, pathname } = useLocation()
  useEffect(() => {
    const target = new URLSearchParams(search).get('focus')
    if (!target) return
    let stopped = false
    let tries = 0
    let opened = false
    const tick = () => {
      if (stopped) return
      tries++
      const el = findField(target)
      if (el) return flash(el)
      // after ~1.5 s, open collapsed sections once and look again
      if (tries === 6 && !opened) {
        opened = true
        Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], div, span'))
          .filter((b) => SECTION_TOGGLES.test((b.textContent ?? '').trim()) && b.offsetParent !== null && b.children.length <= 2)
          .forEach((b) => b.click())
      }
      if (tries < 24) setTimeout(tick, 250)
      else toast.message(`"${target}" isn't on this page yet; it may not be entered.`)
    }
    const t = setTimeout(tick, 400)
    return () => {
      stopped = true
      clearTimeout(t)
    }
  }, [search, pathname])
  return null
}
