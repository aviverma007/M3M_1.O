/**
 * /dashboard/project            -> new project (?projectType=residential|commercial|mixed)
 * /dashboard/project/:projectId -> view (all disabled) or update (?edit=true)
 * Original: page-DRwRdHoZ. Save & Next saves then opens /dashboard/project/:id/modules.
 */
import { useEffect, useState, type MouseEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Layers, Map as MapIcon, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingButton } from '@/components/common'
import { useCanCreateProject } from '@/components/common/NewProjectDialog'
import { http, type ApiEnvelope } from '@/api/http'
import { projectKeys, useProject } from '@/api/projects'
import { getPortfolio } from '@/state/portfolio'
import { cn } from '@/lib/utils'
import ProjectField from '@/components/projects/form/ProjectField'
import { projectResolver, type ProjectFormValues, type ProjectPayload } from '@/components/projects/form/validation'
import * as I from '@/components/projects/icons'
import type { Project } from '@/types'

const today = new Date(new Date().toISOString().split('T')[0])

const RES = [
  ['mid-end', 'Mid-End'],
  ['premium', 'Premium'],
  ['affluent', 'Affluent'],
]
const COM = [
  ['hi_street', 'High Street'],
  ['enclosed_mall', 'Enclosed Mall'],
]

function ProjectForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { projectId } = useParams()
  const query = new URLSearchParams(location.search)
  const typeParam = query.get('projectType') ?? ''
  const initialType = ['residential', 'commercial', 'mixed'].includes(typeParam) ? typeParam : 'residential'
  const [projectType, setProjectType] = useState(initialType)
  const [ownersOpen, setOwnersOpen] = useState(' ')
  const isEdit = query.get('edit') === 'true'
  const readOnly = !!projectId && !isEdit
  const [saving, setSaving] = useState(false)

  const { data: project, isFetching } = useProject(projectId)
  const loading = saving || isFetching

  const defaults: ProjectFormValues = {
    projectType: projectType || 'residential',
    name: '',
    category: '',
    location: '',
    projectOwner: '',
    userName: '',
    userEmail: '',
    userNumber: '',
    date: today,
    userDesignation: '',
    projectClassification: '',
    designOwner: '',
    structureOwner: '',
    mepOwner: '',
    far_permissible: '',
    site_area: '',
    site_area_acres: '',
    interiorDesignOwner: '',
    locationCategory: getPortfolio() || '',
    id: projectId || '',
  }
  const form = useForm<ProjectFormValues>({ resolver: projectResolver, defaultValues: defaults })

  // load project into the form
  useEffect(() => {
    if (!projectId || !project) return
    setProjectType(project.projectType || 'residential')
    form.reset({ ...defaults, ...(project as unknown as Partial<ProjectFormValues>), date: project.date ? new Date(project.date) : new Date() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  // open the module-owners row height when one of its fields has an error (original "item-1" flag)
  const errors = form.formState.errors
  useEffect(() => {
    const keys = Object.keys(errors || {})
    setOwnersOpen(['mepOwner', 'designOwner', 'structureOwner'].some((k) => keys.includes(k)) ? 'item-1' : ' ')
  }, [errors, form.formState.submitCount])

  // Site Area (Sq. M) is derived from acres
  const acres = form.watch('site_area_acres')
  useEffect(() => {
    const n = parseFloat(String(acres))
    if (!Number.isNaN(n) && n > 0) form.setValue('site_area', parseFloat((n * 4046.856).toFixed(2)), { shouldValidate: false })
    else if (!acres) form.setValue('site_area', '', { shouldValidate: false })
  }, [acres, form])

  const goBack = (e: MouseEvent) => {
    e.preventDefault()
    navigate(-1)
  }

  const onSubmit = async (values: ProjectFormValues) => {
    const body = { ...(values as unknown as ProjectPayload), id: projectId }
    setSaving(true)
    try {
      const { id, ...rest } = body
      const res = id ? await http.put<ApiEnvelope<Project>>(`/project/${id}`, rest) : await http.post<ApiEnvelope<Project>>('/project', rest)
      toast.success(projectId ? 'Project updated successfully' : 'Project created successfully')
      qc.invalidateQueries({ queryKey: projectKeys.all })
      const target = projectId || res?.data?.id
      if (target) navigate(`/dashboard/project/${target}/modules`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
      toast.error(msg || 'An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const categories = projectType === 'residential' ? RES : projectType === 'commercial' ? COM : [...RES, ...COM]

  return (
    <div className="sm:p-4 px-0.5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 2xl:space-y-3">
          <h1 className="text-xl border-b-1 p-2 pt-2 text-blue-900">{projectId ? 'Update' : ''} Project Information</h1>
          <ProjectField type="input" name="projectType" form={form} icon={I.projectTypeIcon} label="Project Type" placeholder="Enter Project Type" disabled isDisabled={readOnly} />
          <ProjectField type="input" name="name" form={form} icon={I.projectNameIcon} label="Project Name" placeholder="Enter Project Name" isDisabled={readOnly} />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="flex sm:flex-row flex-col relative sm:px-2 px-0 ">
                <FormLabel className="sm:w-1/4 w-full data-[error=true]:text-black">
                  {' '}
                  <img src={I.categoryIcon} alt="" /> Category
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="ring-black ring-1 ">
                    <SelectTrigger className=" sm:w-3/4 w-full bg-white ring-1 ring-gray-400" disabled={readOnly}>
                      <SelectValue placeholder="Select a Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="absolute right-6 bottom-2 text-xs z-10" />
              </FormItem>
            )}
          />

          <ProjectField type="input" name="location" form={form} icon={I.locationIcon} label="Location" placeholder="Enter Location" isDisabled={readOnly} />

          <FormField
            control={form.control}
            name="projectClassification"
            render={({ field }) => (
              <FormItem className="flex sm:flex-row flex-col relative sm:px-2 px-0 ">
                <FormLabel className="sm:w-1/4 w-full data-[error=true]:text-black">
                  {' '}
                  <img src={I.classificationIcon} alt="" /> Project Classification
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className=" ring-black ring-1 ">
                    <SelectTrigger className=" sm:w-3/4 w-full bg-white ring-1 ring-gray-400" disabled={readOnly}>
                      <SelectValue placeholder="Select a project classification" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['Delivered', 'Ongoing (RERA Obtained)', 'Future (License Applied)'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="absolute right-6 bottom-2 text-xs z-10" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="locationCategory"
            render={({ field }) => (
              <FormItem className="flex sm:flex-row flex-col relative sm:px-2 px-0 ">
                <FormLabel className="sm:w-1/4 w-full data-[error=true]:text-black">
                  <MapPin size={22} className="text-[#0a4070]" /> Location Category
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="ring-black ring-1 ">
                    <SelectTrigger className=" sm:w-3/4 w-full bg-white ring-1 ring-gray-400" disabled={readOnly}>
                      <SelectValue placeholder="Select a Location Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['M3M Noida', 'M3M Gurgaon', 'Smartworld'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="absolute right-6 bottom-2 text-xs z-10" />
              </FormItem>
            )}
          />

          <ProjectField
            type="input"
            name="far_permissible"
            form={form}
            icon={<Layers size={22} className="text-[#0a4070]" />}
            label="FAR Permissible"
            placeholder="Enter FAR Permissible"
            isIcon
            number
            inputUnit="Sq m"
            isDisabled={readOnly}
          />
          <ProjectField
            type="input"
            name="site_area_acres"
            form={form}
            icon={<MapIcon className="text-[#0a4070]" size={22} />}
            label="Site Area (Acres)"
            placeholder="Enter Site Area in Acres"
            isIcon
            number
            inputUnit="Acres"
            isDisabled={readOnly}
            maxDecimals={2}
          />
          <ProjectField
            type="input"
            name="site_area"
            form={form}
            icon={<MapIcon className="text-[#0a4070]" size={22} />}
            label="Site Area (Sq. M)"
            placeholder="Auto-calculated from Acres"
            isIcon
            number
            inputUnit="Sq m"
            isDisabled
          />
          <ProjectField
            type="input"
            name="projectOwner"
            form={form}
            icon={I.ownerIcon}
            label=" Project Owner (Project Architect)"
            placeholder="Enter Project Owner (Project Architect)"
            isDisabled={readOnly}
          />

          <div className="p-0 px-2 flex sm:flex-row flex-col justify-start sm:items-center items-start gap-1.5 text-sm ">
            <img src={I.moduleOwnersIcon} alt="" />
            <div className="w-full space-y-2">
              <span className="font-semibold">Module Owners</span>
              <div className={cn('flex sm:flex-row flex-col justify-between w-full sm:items-center items-start sm:px-0 px-2', ownersOpen.trim() && 'h-15')}>
                <span className="w-3/12 font-semibold"> Key Ratios</span>
                <div className="sm:w-9/12 w-full grid lg:grid-cols-3 grid-cols-1 gap-1.5">
                  <ProjectField type="subInput" name="designOwner" form={form} label="Design" placeholder="Enter Design Owner" isDisabled={readOnly} />
                  <ProjectField type="subInput" name="structureOwner" form={form} label="Structure" placeholder="Enter Structure Owner" isDisabled={readOnly} />
                  <ProjectField type="subInput" name="mepOwner" form={form} label="MEP" placeholder="Enter MEP Owner" isDisabled={readOnly} />
                </div>
              </div>
              <div className="flex sm:flex-row flex-col justify-between w-full items-center sm:px-0 px-2">
                <span className="sm:w-3/12 w-full font-semibold">Apartment &amp; Common Design</span>
                <div className="sm:w-9/12 w-full grid lg:grid-cols-3 grid-cols-1 gap-1.5">
                  <ProjectField
                    type="subInput"
                    name="interiorDesignOwner"
                    form={form}
                    label="Interior Design Owner"
                    placeholder="Enter Interior Design Owner"
                    isDisabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-xl border-b-1 p-2 pt-4 text-blue-900">User Information</h1>
          <ProjectField type="input" name="userName" form={form} icon={I.userNameIcon} label="Name" placeholder="Enter Name" isDisabled={readOnly} />
          <ProjectField type="input" name="userEmail" form={form} icon={I.emailIcon} label="Email Id" placeholder="Enter Email Id" isDisabled={readOnly} />
          <ProjectField type="input" name="userNumber" form={form} icon={I.mobileIcon} label="Moblie No." placeholder="Enter Moblie No." tel minLength={10} isDisabled={readOnly} />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex sm:flex-row flex-col relative sm:px-2 px-0 ">
                <FormLabel className="sm:w-1/4 w-full data-[error=true]:text-black">
                  <img src={I.dateIcon} alt="" /> Date
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl className=" bg-white ring-1 ring-gray-400 ">
                      <Button
                        type="button"
                        disabled={readOnly}
                        variant="ghost"
                        className={cn('sm:w-[calc(75%-5px)] w-full text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Select Date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(d) => field.onChange(d ?? null)}
                      disabled={(d) => d > new Date() || d < new Date('1900-01-01')}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="absolute right-6 bottom-2 text-xs" />
              </FormItem>
            )}
          />

          <ProjectField type="input" name="userDesignation" form={form} icon={I.designationIcon} label="Designation" placeholder="Enter Designation" isDisabled={readOnly} />

          <div className=" flex justify-end gap-2">
            <Button type="button" onClick={goBack} variant="outline" className="border-blue-900 border-1 cursor-pointer">
              Go Back
            </Button>
            <LoadingButton variant="btnBlue" title="Save & Next" loading={loading} type="submit" disabled={readOnly} />
          </div>
        </form>
      </Form>
    </div>
  )
}

export default function ProjectFormPage() {
  const allowed = useCanCreateProject()
  if (!allowed) return <Navigate to="/dashboard" replace />
  return (
    <div className="m-auto overflow-hidden">
      <div className="border-y-1 overflow-y-auto max-h-[65vh] xl:max-h-screen">
        <ProjectForm />
      </div>
    </div>
  )
}
