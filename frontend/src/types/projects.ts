/** Types for the "projects" page group (dashboard list, project form, modules). */

/** Row of GET /project/contributor/tasks (general_contributor dashboard). `id` is the project id. */
export type ContributorTask = {
  id: number
  internalTaskId?: number | string
  name: string
  department: string
  projectType: string
  assignedBy?: string | null
  date?: string | null
  createdAt?: string
  deadline?: string | null
  status: string
}
