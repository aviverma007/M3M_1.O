/**
 * Form schema of a chapter (original zod schema `ms`): every select/input field is required
 * ("This field is required"), every multiselect needs at least one value.
 */
import type { FieldErrors, Resolver } from 'react-hook-form'
import type { ChapterSection, FieldAnswer } from '@/types/module-workspace'

export type ChapterFormValues = { fields: Record<string, FieldAnswer> }

export function defaultFieldValues(sections: ChapterSection[] = []): ChapterFormValues {
  const fields: Record<string, FieldAnswer> = {}
  sections.forEach((s) =>
    s.sectionFields?.forEach((f) => {
      const a = f.fieldValue?.answer
      fields[f.id] = f.fieldType === 'multiselect' ? (Array.isArray(a) ? a : a ? [a] : []) : (a as string) || ''
    }),
  )
  return { fields }
}

export function chapterResolver(sections: ChapterSection[] = []): Resolver<ChapterFormValues> {
  return async (values) => {
    const errors: Record<string, { type: string; message: string }> = {}
    sections.forEach((s) =>
      s.sectionFields?.forEach((f) => {
        const v = values.fields?.[f.id]
        if (f.fieldType === 'multiselect') {
          if (!Array.isArray(v) || v.length < 1) errors[f.id] = { type: 'too_small', message: 'Array must contain at least 1 element(s)' }
        } else if (typeof v !== 'string' || v.length < 1) errors[f.id] = { type: 'too_small', message: 'This field is required' }
      }),
    )
    return Object.keys(errors).length ? { values: {}, errors: { fields: errors } as unknown as FieldErrors<ChapterFormValues> } : { values, errors: {} }
  }
}
