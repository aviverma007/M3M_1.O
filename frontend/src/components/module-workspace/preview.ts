/**
 * "Preview / Submit" mode (original redux `preview.isPreview`, persisted with redux-persist).
 * When on, the module layout shows the project details accordion and Previous/Next Module navigation.
 * ModulesPage should call setModulePreview(true) on "Preview / Submit" and setModulePreview(false) when a module card is opened.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'm3m.preview'
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setModulePreview(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function useModulePreview() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => false,
  )
}
