/** Top bar of the key ratio pages: module stepper | Import CSV + Compare Project (original goe/Qae header). */
import { Table } from 'lucide-react'
import ModuleStepper from '@/components/module-workspace/ModuleStepper'
import ImportCsvDialog from '@/components/module-workspace/ImportCsvDialog'
import CompareProjectDialog from '@/components/module-workspace/CompareProjectDialog'

type Props = {
  importFile: File | null
  setImportFile: (f: File | null) => void
  onUpload: () => void
  importing?: boolean
  importOpen: boolean
  setImportOpen: (o: boolean) => void
  /** saves the current values as draft before navigating to compare */
  onSaveDraft: () => Promise<unknown>
}

export default function KeyRatioHeader({ importFile, setImportFile, onUpload, importing, importOpen, setImportOpen, onSaveDraft }: Props) {
  return (
    <div className="w-full m-0 flex flex-wrap justify-between items-center py-2 sm:bg-white bg-transparent rounded-md">
      <ModuleStepper />
      <div className="flex gap-2 sm:pr-4 p-0 sm:pl-10 md:pl-0">
        <ImportCsvDialog
          selectedImportFile={importFile}
          setSelectedImportFile={setImportFile}
          handleMediaUpload={onUpload}
          isLoading={importing}
          open={importOpen}
          handleOpenPopUp={() => setImportOpen(true)}
          handleClosePopUp={() => setImportOpen(false)}
        />
        <CompareProjectDialog
          trigger={
            <>
              <span className="md:inline sm:hidden inline">Compare Project</span> <Table className="hidden md:hidden sm:inline" />
            </>
          }
          onSaveDraft={onSaveDraft}
        />
      </div>
    </div>
  )
}
