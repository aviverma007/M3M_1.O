/**
 * Compare Projects (original chunk index-CsstsfxU). Routes:
 *   /dashboard/compare, .../modules/:moduleId/compare, .../keyratio/compare, .../chapter/:chapterId/compare
 * Query: ?module=&chapter=&p1=&p2=… -> POST /compare/get-projects.
 * Key ratio modules (1 / commercial key ratio) show the ratio comparison; others the chapter comparison.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label, Switch } from '@/components/ui/misc'
import PageLoader from '@/components/common/PageLoader'
import CompareProjectDialog from '@/components/module-workspace/CompareProjectDialog'
import ResidentialCompare from '@/components/keyratio/compare/ResidentialCompare'
import CommercialCompare from '@/components/keyratio/compare/CommercialCompare'
import ChapterCompare from '@/components/keyratio/compare/ChapterCompare'
import { getCompareProjects } from '@/api/keyratio-compare'
import { ApiError } from '@/api/http'
import type { CompareResponse } from '@/types/keyratio-compare'

const MODULE_TITLES: Record<string, string> = {
  1: 'Key Ratio',
  2: 'Apartment Design',
  3: 'Common Design',
  4: 'Key Ratio',
  5: 'Commercial Complex Design Considerations',
}

export default function ComparePage() {
  const [findSimilar, setFindSimilar] = useState(false)
  const [hideEntry, setHideEntry] = useState(false)
  const [enable, setEnable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { projectId } = useParams()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const ids = useMemo(() => {
    const out: string[] = []
    params.forEach((v, k) => /^p\d+$/.test(k) && out.push(v))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])
  const moduleQ = params.get('module') || '1'
  const chapterQ = params.get('chapter') || '1'
  const [data, setData] = useState<Partial<CompareResponse>>({})
  const commercial = data?.comparedProjects?.[0]?.projectType?.toLowerCase() === 'commercial'

  useEffect(() => {
    if (!(projectId || ids.length > 0)) return
    setData({})
    setLoading(true)
    getCompareProjects({ currentProjectId: projectId, compareProjectIds: ids, moduleId: moduleQ, chapterId: chapterQ })
      .then((res) => setData(res?.data || {}))
      .catch((e) => {
        console.error('Error fetching compare projects', e)
        setError('Failed to compare incomplete projects')
        // original shows the axios message ("Request failed with status code N")
        toast.error(e instanceof ApiError ? `Request failed with status code ${e.status}` : (e as Error)?.message)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ids.join(','), moduleQ, chapterQ])

  const onHide = (v: boolean) => {
    setHideEntry(v)
    if (v) setEnable(false)
  }
  const onEnable = (v: boolean) => {
    setEnable(v)
    if (v) setHideEntry(false)
  }

  const go = (which: 'nextModule' | 'prevModule') => {
    const base = pathname.split('/compare')[0]
    const qs = ids.map((id, i) => `p${i + 1}=${id}`).join('&')
    const { moduleId, firstChapterId } = data?.navigation?.[which] || ({} as { moduleId?: number; firstChapterId?: number })
    navigate(`${base}/compare?module=${moduleId}&chapter=${firstChapterId}&${qs}`)
  }

  // commercial key ratio is module 101 in our catalogue (the original's API numbered it 4)
  const moduleName = MODULE_TITLES[moduleQ] ?? data?.module?.name
  const isKeyRatio = pathname.includes('/keyratio') || ['1', '4', '101'].includes(moduleQ) || moduleName === 'Key Ratio'
  const numQ = Number(moduleQ)

  return (
    <>
      <div className=" space-y-2.5 m-auto overflow-hidden relative mt-2">
        {!projectId && (
          <div className="rounded-md bg-white flex justify-between items-center py-2 md:px-5 p-1">
            <Button className="cursor-pointer " variant="ghost" onClick={() => go('prevModule')} disabled={data?.navigation?.prevModule === null}>
              <ArrowLeft />
              <span className="sm:inline hidden">Previous Module</span>
            </Button>
            <div className="flex gap-1">
              <span className="font-semibold sm:text-base text-xs sm:inline hidden">Module {numQ % 3 === 0 ? 3 : numQ % 3} -</span>
              <span className="font-semibold xs:text-base text-xs">{moduleName}</span>
            </div>
            <Button className="cursor-pointer" variant="ghost" onClick={() => go('nextModule')} disabled={data?.navigation?.nextModule === null}>
              <span className="sm:inline hidden">Next Module</span>
              <ArrowRight />
            </Button>
          </div>
        )}
        <div className="w-full m-auto flex xs:flex-row flex-col flex-wrap justify-between items-center py-2 sm:px-5 px-2 gap-1 bg-white rounded-md">
          <div className="font-semibold px-1 ">Compare Project</div>
          <div className="flex gap-2 flex-wrap xs:flex-row flex-col">
            {findSimilar ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer w-17" htmlFor="hideEntry">
                    Hide Entry
                  </Label>
                  <Switch id="hideEntry" checked={hideEntry} onCheckedChange={onHide} className="cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer w-14" htmlFor="enableSecond">
                    {enable ? 'Enable' : 'Disable'}
                  </Label>
                  <Switch id="enableSecond" checked={enable} onCheckedChange={onEnable} className="cursor-pointer" />
                </div>
              </div>
            ) : (
              !projectId && (
                <Button variant="outline" onClick={() => setFindSimilar(true)} className="cursor-pointer">
                  Find Similar Property
                </Button>
              )
            )}
            <CompareProjectDialog trigger="+ Add More Comparison" currentProjectType={commercial ? 'commercial' : 'residential'} />
          </div>
        </div>
      </div>
      <div>
        {error ? (
          <div className="min-h-[50vh] relative flex justify-center items-center flex-col gap-2 ">
            <div className=" text-red-800">{error}</div>
            <Button variant="btnBlue" asChild className="">
              <Link to="/dashboard">
                Go Back To Dashbord <LogOut />
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="min-h-[50vh] relative">
            <PageLoader />
          </div>
        ) : isKeyRatio ? (
          commercial ? (
            <CommercialCompare currentProjectData={data?.currentProject || {}} compareProjectsData={data?.comparedProjects || []} hideEntry={hideEntry} isEntryenable={enable} />
          ) : (
            <ResidentialCompare currentProjectData={data?.currentProject || {}} compareProjectsData={data?.comparedProjects || []} hideEntry={hideEntry} isEntryenable={enable} />
          )
        ) : (
          <ChapterCompare hideEntry={hideEntry} isEntryenable={enable} completeCompareProjectData={data} searchParamData={{ module: moduleQ, chapter: String(chapterQ) }} />
        )}
      </div>
      {!projectId && !error && (
        <div className="text-right mr-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              Exit <LogOut />
            </Link>
          </Button>
        </div>
      )}
    </>
  )
}
