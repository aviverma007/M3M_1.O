/** Row-style form field used by the project form (original helper `m`: type "input" | "subInput"). */
import type { FormEvent, ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ProjectFormValues } from './validation'

type Name = keyof ProjectFormValues & string

type Props = {
  type: 'input' | 'subInput'
  name: Name
  form: UseFormReturn<ProjectFormValues>
  icon?: string | ReactNode
  isIcon?: boolean
  label: string
  placeholder: string
  disabled?: boolean
  number?: boolean
  tel?: boolean
  inputUnit?: string
  isDisabled?: boolean
  maxDecimals?: number
  minLength?: number
}

/** numeric input: digits + one dot, max 8 chars, optional max decimals, leading "." -> "0." */
function sanitizeNumber(e: FormEvent<HTMLInputElement>, onChange: (v: string) => void, maxDecimals?: number) {
  const el = e.currentTarget
  let v = el.value.replace(/[^0-9.]/g, '')
  if (v.length > 8) v = v.slice(0, 8)
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts[1]
  if (maxDecimals !== undefined && parts.length === 2 && parts[1].length > maxDecimals) v = parts[0] + '.' + parts[1].slice(0, maxDecimals)
  if (v.startsWith('.')) v = '0' + v
  el.value = v
  onChange(v)
}

/** mobile input: digits only, first digit 6-9, max 10 */
function sanitizePhone(e: FormEvent<HTMLInputElement>, onChange: (v: string) => void) {
  const el = e.currentTarget
  let v = el.value.replace(/\D/g, '')
  if (v.length === 1 && !/^[6-9]$/.test(v)) v = ''
  if (v.length > 10) v = v.slice(0, 10)
  el.value = v
  onChange(v)
}

export default function ProjectField({
  type,
  name,
  form,
  icon,
  isIcon,
  label,
  placeholder,
  disabled = false,
  number = false,
  tel = false,
  inputUnit = '',
  isDisabled,
  maxDecimals,
  minLength,
}: Props) {
  if (type === 'subInput') {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col sm:flex-row relative px-2 justify-between">
            <FormLabel className="data-[error=true]:text-black text-xs">{label}</FormLabel>
            <FormControl className=" ring-black ring-1 ">
              <Input
                placeholder={placeholder}
                {...field}
                value={(field.value as string) ?? ''}
                className="bg-white ring-1 ring-gray-400 lg:max-w-[180px] sm:max-w-4/6 w-full"
                disabled={isDisabled}
              />
            </FormControl>
            <FormMessage className="absolute right-3 -bottom-4 text-xs" />
          </FormItem>
        )}
      />
    )
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex sm:flex-row flex-col relative sm:px-2 px-0 ">
          <FormLabel className="sm:w-1/4 w-full data-[error=true]:text-black">
            {isIcon ? icon : <img src={icon as string} alt={label} />}
            <span>{label}</span>
          </FormLabel>
          <FormControl className={cn('sm:w-3/4 w-full ring-black ring-1')}>
            <div className="ring-transparent relative">
              <Input
                type="text"
                placeholder={placeholder}
                {...field}
                value={(field.value as string | number) ?? ''}
                disabled={disabled || isDisabled}
                minLength={minLength}
                className={name === 'projectType' ? 'capitalize bg-white ring-1 ring-gray-400' : 'bg-white ring-1 ring-gray-400 peer'}
                onInput={(e) => {
                  if (number) sanitizeNumber(e, field.onChange, maxDecimals)
                  else if (tel) sanitizePhone(e, field.onChange)
                }}
              />
              {inputUnit && (
                <span
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent px-1 pointer-events-none select-none peer-focus-within:text-black',
                    field.value && 'text-black peer-disabled:text-gray-400',
                  )}
                  style={{ zIndex: 2 }}
                >
                  {inputUnit}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage className="absolute right-6 bottom-2 text-xs" />
        </FormItem>
      )}
    />
  )
}
