/**
 * Project form validation — same rules and messages as the original zod schema (page-DRwRdHoZ `Qe`).
 * zod isn't a dependency here, so this is a hand-written react-hook-form resolver.
 * Like zod, unknown keys are stripped and numeric fields are transformed to numbers.
 */
import type { FieldErrors, Resolver } from 'react-hook-form'

export type ProjectFormValues = {
  projectType: string
  name: string
  category: string
  location: string
  projectOwner: string
  userName: string
  userEmail: string
  userNumber: string
  date: Date | null
  userDesignation: string
  projectClassification: string
  designOwner: string
  structureOwner: string
  mepOwner: string
  interiorDesignOwner: string
  far_permissible: string | number
  site_area: string | number
  site_area_acres: string | number
  locationCategory: string
  id?: string | number
}

export type ProjectPayload = Omit<ProjectFormValues, 'far_permissible' | 'site_area' | 'site_area_acres'> & {
  far_permissible: number
  site_area: number
  site_area_acres: number | ''
}

const CATEGORIES = ['mid-end', 'premium', 'affluent', 'enclosed_mall', 'hi_street']
const CLASSIFICATIONS = ['Delivered', 'Ongoing (RERA Obtained)', 'Future (License Applied)']

const joinValues = (v: string[]) => v.map((x) => `'${x}'`).join(' | ')
const enumMsg = (opts: string[], received: unknown) =>
  received === undefined ? 'Required' : `Invalid enum value. Expected ${joinValues(opts)}, received '${String(received)}'`

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v))

export const projectResolver: Resolver<ProjectFormValues> = async (values) => {
  const errors: Record<string, string> = {}
  const minLen = (key: keyof ProjectFormValues, n: number, msg: string) => {
    const v = values[key]
    if (typeof v !== 'string') errors[key] = v === undefined ? 'Required' : `Expected string, received ${v === null ? 'null' : typeof v}`
    else if (v.length < n) errors[key] = msg
  }

  minLen('projectType', 2, 'Project Type must be at least 8 characters.')
  minLen('name', 2, 'Project Name must be at least 8 characters.')
  if (!CATEGORIES.includes(values.category)) errors.category = enumMsg(CATEGORIES, values.category)
  minLen('location', 1, 'Location cannot be empty.')
  minLen('userName', 3, 'Name must be at least 3 characters.')
  minLen('projectOwner', 3, 'Name must be at least 3 characters.')

  const email = str(values.userEmail) ?? ''
  if (!/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(email) || !/\.(com|net|org|co\.in|in|edu|gov|io|ai)$/i.test(email))
    errors.userEmail = 'Please enter valid email'

  const phone = str(values.userNumber) ?? ''
  if (phone.length < 10 || phone.length > 10) errors.userNumber = 'Mobile number must be 10 digits long'
  else if (!/^\d+$/.test(phone)) errors.userNumber = 'Mobile number must contain only numbers'

  const d = values.date
  if (!(d instanceof Date)) errors.date = d == null ? 'Required' : 'Expected date, received string'
  else if (Number.isNaN(d.getTime())) errors.date = 'Invalid date'

  minLen('userDesignation', 2, 'Designation must be at least 6 characters.')
  if (!CLASSIFICATIONS.includes(values.projectClassification)) errors.projectClassification = enumMsg(CLASSIFICATIONS, values.projectClassification)
  minLen('designOwner', 3, 'Name must be at least 3 characters.')
  minLen('structureOwner', 3, 'Name must be at least 3 characters.')
  minLen('mepOwner', 3, 'Name must be at least 3 characters.')
  minLen('interiorDesignOwner', 3, 'Name must be at least 3 characters.')

  for (const k of ['far_permissible', 'site_area'] as const) {
    const v = values[k]
    if (typeof v !== 'string' && typeof v !== 'number') errors[k] = 'Invalid input'
    else if (Number.isNaN(Number(v))) errors[k] = 'Must be a valid number'
  }
  const acres = values.site_area_acres
  if (acres != null && typeof acres !== 'string' && typeof acres !== 'number') errors.site_area_acres = 'Invalid input'

  minLen('locationCategory', 1, 'Please select a location category.')

  if (Object.keys(errors).length) {
    const fe: FieldErrors<ProjectFormValues> = {}
    for (const [k, message] of Object.entries(errors)) (fe as Record<string, unknown>)[k] = { type: 'custom', message }
    return { values: {}, errors: fe }
  }

  const out: ProjectPayload = {
    projectType: values.projectType,
    name: values.name,
    category: values.category,
    location: values.location,
    projectOwner: values.projectOwner,
    userName: values.userName,
    userEmail: values.userEmail,
    userNumber: values.userNumber,
    date: values.date,
    userDesignation: values.userDesignation,
    projectClassification: values.projectClassification,
    designOwner: values.designOwner,
    structureOwner: values.structureOwner,
    mepOwner: values.mepOwner,
    interiorDesignOwner: values.interiorDesignOwner,
    far_permissible: Number(values.far_permissible),
    site_area: Number(values.site_area),
    site_area_acres: acres === '' || acres == null ? '' : Number(acres),
    locationCategory: values.locationCategory,
  }
  return { values: out as unknown as ProjectFormValues, errors: {} }
}
