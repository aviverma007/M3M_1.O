/**
 * Module workspace seed (Apartment Design = module 2, Common Design = module 3,
 * Commercial Complex Design Considerations = module 102).
 *
 * Catalogue tables (shared with the chapters-a group, which seeds modules 2/3 in seed/chapters-a-catalogue.ts):
 *   chapters        { id, moduleId, chapterNumber, title, status }
 *   chapterSections { id, chapterId, title, order }
 *   sectionFields   { id, sectionId, chapterId, fieldName, fieldType, options[], midEndAns[], premiumAns[], affluentAns[], hiStreetAns[], enclosedMallAns[] }
 * Per-project tables (owned here):
 *   chapterFieldValues { projectId, moduleId, chapterId, sectionId, sectionFieldId, answer: {answer, remark, isFlaged, anyOtherAnswer, benchmarkAnswer} }
 *   projectChapters    { projectId, moduleId, chapterId, status: 'completed' }
 * All data is fictional reference data.
 */
import { registerSeed, type Db } from '../db'
import { ensureModuleWorkspaceCatalogue, recomputeModuleProgress } from '../handlers/module-workspace'

/** Project 1 has Apartment Design chapter 1 (Flooring) filled in, so the module grid and chapter list show progress. */
function seedSampleAnswers(db: Db) {
  const projectId = 1
  if (!db.table('projects').find(projectId)) return
  if (db.table('chapterFieldValues').first((v) => v.projectId === projectId)) return
  const chapter = db.table('chapters').first((c) => c.moduleId === 2 && Number(c.chapterNumber) === 1)
  if (!chapter) return
  const sections = db.table('chapterSections').where((s) => s.chapterId === chapter.id)
  let first = true
  sections.forEach((s) => {
    db.table('sectionFields')
      .where((f) => f.sectionId === s.id)
      .forEach((f) => {
        const bench = (f.premiumAns as string[] | undefined) ?? []
        const options = (f.options as string[] | undefined) ?? []
        const multi = f.fieldType === 'multiselect'
        // one deliberate deviation (with remark + flag) so flags/deviations are non-zero
        const deviate = first && options.length > 1
        const chosen = deviate ? options.find((o) => !bench.includes(o)) ?? options[0] : bench[0] ?? options[0]
        first = false
        db.table('chapterFieldValues').insert({
          projectId,
          moduleId: 2,
          chapterId: chapter.id,
          sectionId: s.id,
          sectionFieldId: f.id,
          answer: {
            answer: multi ? [chosen] : chosen,
            remark: deviate ? 'Client prefers a larger format in the living area.' : '',
            isFlaged: deviate ? 1 : 0,
            anyOtherAnswer: '',
            benchmarkAnswer: bench,
          },
        })
      })
  })
  db.table('projectChapters').insert({ projectId, moduleId: 2, chapterId: chapter.id, status: 'completed' })
  recomputeModuleProgress(projectId, 2)
}

registerSeed((db) => {
  ensureModuleWorkspaceCatalogue(db)
  seedSampleAnswers(db)
  // other seeds (e.g. keyratio-compare) also fill chapterFieldValues: bring every module progress row in line
  const pairs = new Set(db.table('chapterFieldValues').all().map((v) => `${v.projectId}:${v.moduleId}`))
  pairs.forEach((k) => {
    const [projectId, moduleId] = k.split(':').map(Number)
    recomputeModuleProgress(projectId, moduleId)
  })
})
