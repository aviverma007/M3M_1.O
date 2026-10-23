/** Dashboard filter bar: date range, project type, project category, reset (original `he`). */
import { useEffect, useState, type ChangeEvent } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { resetIcon } from '../icons'

export type ListFilters = {
  search: string
  from: string
  to: string
  projectType: string
  projectCategory: string
  page: number | string
  limit: number | string
  locationCategory?: string
}

const fmt = (d: Date | null) => (d ? format(d, 'PPP') : '')
const isValid = (d: Date | null) => (d ? !Number.isNaN(d.getTime()) : false)

/** Text input + calendar popover (typing a date also works, ArrowDown opens the calendar). */
function DateInput({ text, id, value, onChange }: { text: string; id: string; value: Date | null; onChange: (d: Date | null) => void }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Date | null>(value)
  const [month, setMonth] = useState<Date>(value || new Date())
  const [display, setDisplay] = useState(fmt(value))

  const valueKey = value?.getTime() ?? null
  useEffect(() => {
    setSelected(value)
    setMonth(value || new Date())
    setDisplay(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey])

  const pick = (d: Date | undefined) => {
    const v = d ?? null
    setSelected(v)
    setDisplay(fmt(v))
    setOpen(false)
    onChange(v)
  }
  const typed = (e: ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setDisplay(t)
    const d = new Date(t)
    if (isValid(d)) {
      setSelected(d)
      setMonth(d)
      onChange(d)
    } else if (t === '') {
      setSelected(null)
      onChange(null)
    }
  }

  return (
    <div className="relative flex items-center w-full filterWidth">
      <Input
        id={id}
        value={display}
        placeholder={text}
        onChange={typed}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="pl-10 bg-white"
        autoComplete="off"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground cursor-pointer"
            aria-label="Select date"
          >
            <CalendarIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            month={month}
            onMonthChange={setMonth}
            onSelect={pick}
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date()}
            disabled={(d) => d > new Date() || d < new Date('1900-01-01')}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

const RES_CATEGORIES = [
  ['mid-end', 'Mid-End Projects'],
  ['premium', 'Premium Projects'],
  ['affluent', 'Affluent Projects'],
]
const COM_CATEGORIES = [
  ['hi_street', 'High Street'],
  ['enclosed_mall', 'Enclosed Mall'],
]

export default function ProjectFilters({
  filters,
  onFilterChange,
  handleResetFilters,
}: {
  filters: ListFilters
  onFilterChange: (patch: Partial<ListFilters>) => void
  handleResetFilters: () => void
}) {
  const setDate = (key: 'from' | 'to', d: Date | null) => {
    if (!d) return onFilterChange({ [key]: '' })
    const n = new Date(d)
    n.setHours(5, 30, 0, 0)
    onFilterChange({ [key]: n.toISOString() })
  }
  const setSelect = (key: 'projectType' | 'projectCategory', v: string) =>
    onFilterChange(key === 'projectType' && v === 'all' ? { [key]: '' } : { [key]: v })

  const categories = !filters.projectType
    ? [...RES_CATEGORIES, ...COM_CATEGORIES]
    : filters.projectType === 'residential'
      ? RES_CATEGORIES
      : filters.projectType === 'commercial'
        ? COM_CATEGORIES
        : null

  return (
    <div className="bg-gray-100 sm:p-4 p-0 rounded-md sm:ring-1 ring-0 ring-gray-300">
      <form className="flex md:justify-around md:gap-4 sm:gap-2 gap-1 justify-start items-end  flex-wrap typo-basic">
        <div>
          <label htmlFor="date-range">Select Date Range</label>
          <div className="flex sm:flex-row flex-col gap-2 pt-1">
            <DateInput text="From" id="from-date" value={filters.from ? new Date(filters.from) : null} onChange={(d) => setDate('from', d)} />
            <DateInput text="To" id="to-date" value={filters.to ? new Date(filters.to) : null} onChange={(d) => setDate('to', d)} />
          </div>
        </div>
        <div>
          <label htmlFor="project-type">Project Type</label>
          <Select value={filters.projectType || 'all'} onValueChange={(v) => setSelect('projectType', v)}>
            <SelectTrigger id="project-type" className="filterWidth cursor-pointer bg-white">
              <SelectValue placeholder="Select Project Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="project-category">Project Category</label>
          <Select value={filters.projectCategory} onValueChange={(v) => setSelect('projectCategory', v)}>
            <SelectTrigger id="project-category" className="filterWidth cursor-pointer bg-white">
              <SelectValue placeholder="Select Project Category" />
            </SelectTrigger>
            {categories && (
              <SelectContent>
                {categories.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            )}
          </Select>
        </div>
        <Button type="button" className="cursor-pointer sm:ring-0 ring ring-gray-300 typo-basic sm:w-25 w-[95svw]" variant="ghost" onClick={handleResetFilters}>
          <img src={resetIcon} alt="" /> Reset Filter
        </Button>
      </form>
    </div>
  )
}
