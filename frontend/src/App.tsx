import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/auth/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageLoader from '@/components/common/PageLoader'
import { NotFound } from '@/components/common'
import LoginPage from '@/pages/auth/LoginPage'
import { AccountLockedPage, ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth/PasswordPages'
import { SelectLocationPage, SelectPortfolioPage } from '@/pages/portfolio/PortfolioPages'

/* lazy pages (same route tree as the original app) */
const P = {
  ProjectsList: lazy(() => import('@/pages/dashboard/ProjectsListPage')),
  ProjectForm: lazy(() => import('@/pages/project/ProjectFormPage')),
  Modules: lazy(() => import('@/pages/project/ModulesPage')),
  ModuleLayout: lazy(() => import('@/pages/project/ModuleLayout')),
  KeyRatio: lazy(() => import('@/pages/project/keyratio/KeyRatioPage')),
  Chapter: lazy(() => import('@/pages/project/chapter/ChapterPage')),
  Compare: lazy(() => import('@/pages/compare/ComparePage')),
  DesignBriefLanding: lazy(() => import('@/pages/design-brief/DesignBriefLandingPage')),
  DesignBriefLayout: lazy(() => import('@/pages/design-brief/DesignBriefLayout')),
  Liaison: lazy(() => import('@/pages/design-brief/LiaisonForm')),
  BusinessDevelopment: lazy(() => import('@/pages/design-brief/BusinessDevelopmentForm')),
  Land: lazy(() => import('@/pages/design-brief/LandForm')),
  StructureBrief: lazy(() => import('@/pages/design-brief/StructureForm')),
  MEPBrief: lazy(() => import('@/pages/design-brief/MEPForm')),
  AllDesignBrief: lazy(() => import('@/pages/design-brief/AllDesignBrief')),
  FinalSubmission: lazy(() => import('@/pages/design-brief/FinalSubmissionForm')),
  DesignChapters: lazy(() => import('@/pages/design-chapters/DesignChaptersPage')),
  ProjectDetails: lazy(() => import('@/pages/design-chapters/ProjectDetailsLayoutForm')),
  ProjectLevelDesign: lazy(() => import('@/pages/design-chapters/ProjectLevelDesignForm')),
  UnitLevelDesign: lazy(() => import('@/pages/design-chapters/UnitLevelDesignForm')),
  IDSpecifications: lazy(() => import('@/pages/design-chapters/IDSpecificationsForm')),
  CommonArea: lazy(() => import('@/pages/design-chapters/CommonAreaForm')),
  LandscapeAmenities: lazy(() => import('@/pages/design-chapters/LandscapeAmenitiesForm')),
  ServiceDesign: lazy(() => import('@/pages/design-chapters/ServiceDesignForm')),
  ContractingStrategy: lazy(() => import('@/pages/design-chapters/ContractingStrategyForm')),
  ConsultantStrategy: lazy(() => import('@/pages/design-chapters/ConsultantStrategyForm')),
  PhasingPlan: lazy(() => import('@/pages/design-chapters/PhasingPlanForm')),
  ProjectSchedule: lazy(() => import('@/pages/design-chapters/ProjectScheduleForm')),
  Approvals: lazy(() => import('@/pages/design-chapters/ApprovalsForm')),
  AdditionalDetails: lazy(() => import('@/pages/design-chapters/AdditionalProjectDetailsForm')),
  ExportConfiguration: lazy(() => import('@/pages/design-chapters/ExportConfigurationForm')),
  StructureChapter: lazy(() => import('@/pages/design-chapters/StructureChapterForm')),
  MEPChapter: lazy(() => import('@/pages/design-chapters/MEPChapterForm')),
  RolesAccess: lazy(() => import('@/pages/admin/RolesAccessPage')),
  AuditLogs: lazy(() => import('@/pages/admin/AuditLogsPage')),
}

const L = (C: ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <C />
  </Suspense>
)

/** fade-in wrapper used on auth pages in the original */
const Fade = ({ children }: { children: ReactNode }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="flex flex-col grow">
    {children}
  </motion.div>
)

function RequireAuth() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Fade><LoginPage /></Fade>} />
      <Route path="/forgot-password" element={<Fade><ForgotPasswordPage /></Fade>} />
      <Route path="/reset-password" element={<Fade><ResetPasswordPage /></Fade>} />
      <Route path="/account-locked" element={<Fade><AccountLockedPage /></Fade>} />

      <Route element={<RequireAuth />}>
        <Route path="/select-location" element={<SelectLocationPage />} />
        <Route path="/select-portfolio" element={<SelectPortfolioPage />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={L(P.ProjectsList)} />
          <Route path="landing" element={<Navigate to="/select-location" replace />} />
          <Route path="project" element={L(P.ProjectForm)} />
          <Route path="project/:projectId">
            <Route index element={L(P.ProjectForm)} />
            <Route path="modules" element={L(P.Modules)} />
            <Route path="modules/:moduleId" element={L(P.ModuleLayout)}>
              <Route path="keyratio" element={L(P.KeyRatio)}>
                <Route path="compare" element={L(P.Compare)} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="chapter/:chapterId" element={L(P.Chapter)}>
                <Route path="compare" element={L(P.Compare)} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="compare" element={L(P.Compare)} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="design-brief">
              <Route index element={L(P.DesignBriefLanding)} />
              <Route element={L(P.DesignBriefLayout)}>
                <Route path="liaison" element={L(P.Liaison)} />
                <Route path="business-development" element={L(P.BusinessDevelopment)} />
                <Route path="land" element={L(P.Land)} />
                <Route path="structure" element={L(P.StructureBrief)} />
                <Route path="mep" element={L(P.MEPBrief)} />
                <Route path="all" element={L(P.AllDesignBrief)} />
                <Route path="final-submission" element={L(P.FinalSubmission)} />
              </Route>
            </Route>
            <Route path="design-chapters" element={L(P.DesignChapters)} />
            <Route path="design-chapters/project-details" element={L(P.ProjectDetails)} />
            <Route path="design-chapters/project-level-design" element={L(P.ProjectLevelDesign)} />
            <Route path="design-chapters/unit-level-design" element={L(P.UnitLevelDesign)} />
            <Route path="design-chapters/id-specifications" element={L(P.IDSpecifications)} />
            <Route path="design-chapters/common-area" element={L(P.CommonArea)} />
            <Route path="design-chapters/landscape-amenities" element={L(P.LandscapeAmenities)} />
            <Route path="design-chapters/service-design" element={L(P.ServiceDesign)} />
            <Route path="design-chapters/contracting-strategy" element={L(P.ContractingStrategy)} />
            <Route path="design-chapters/consultant-strategy" element={L(P.ConsultantStrategy)} />
            <Route path="design-chapters/phasing-plan" element={L(P.PhasingPlan)} />
            <Route path="design-chapters/project-schedule" element={L(P.ProjectSchedule)} />
            <Route path="design-chapters/approvals" element={L(P.Approvals)} />
            <Route path="design-chapters/additional-details" element={L(P.AdditionalDetails)} />
            <Route path="design-chapters/export-configuration" element={L(P.ExportConfiguration)} />
            <Route path="design-chapters/structure" element={L(P.StructureChapter)} />
            <Route path="design-chapters/mep" element={L(P.MEPChapter)} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="compare" element={L(P.Compare)} />
          <Route path="roles-access-control" element={L(P.RolesAccess)} />
          <Route path="audit-logs" element={L(P.AuditLogs)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
