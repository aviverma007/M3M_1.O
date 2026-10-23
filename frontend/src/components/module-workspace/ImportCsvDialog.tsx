/** "Import CSV" dialog (original o5 + kte file drop zone). */
import { useRef, useState, type DragEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogContent } from '@/components/ui/overlays'
import { LoadingButton } from '@/components/common'
import { downloadImportFormat } from '@/api/module-workspace'
import { cn } from '@/lib/utils'
import { deleteIcon, uploadIcon } from './icons'

type Props = {
  selectedImportFile: File | null
  setSelectedImportFile: (f: File | null) => void
  handleMediaUpload: () => void
  isLoading?: boolean
  open?: boolean
  handleOpenPopUp: () => void
  handleClosePopUp: () => void
}

/** Drag & drop / browse area (original kte, react-dropzone). */
function FileDrop({ accept, acceptedFileTypes, onFileUpload }: { accept: string; acceptedFileTypes: string[]; onFileUpload: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const pick = (files: FileList | null) => {
    const f = files?.[0]
    if (f && acceptedFileTypes.some((t) => f.name.toLowerCase().endsWith(`.${t}`))) onFileUpload(f)
  }
  return (
    <div className="w-full">
      <div
        role="presentation"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onDragOver={(e: DragEvent) => e.preventDefault()}
        onDrop={(e: DragEvent) => {
          e.preventDefault()
          pick(e.dataTransfer.files)
        }}
        className="rounded-md md:p-4 p-2 flex flex-col items-center justify-center text-center w-full typo-basic-2 mt-0"
      >
        <input ref={input} type="file" accept={accept} tabIndex={-1} style={{ display: 'none' }} onChange={(e) => pick(e.target.files)} />
        <div className="text-gray-400 mb-4">
          <img src={uploadIcon} />
        </div>
        <p className="text-gray-600 mb-1">
          Drag and drop your files or<span className="text-primary cursor-pointer"> Browse</span>
        </p>
        <p className="text-sm text-gray-400">Supported format : {acceptedFileTypes.join(', ')}</p>
      </div>
    </div>
  )
}

export default function ImportCsvDialog({ selectedImportFile, setSelectedImportFile, handleMediaUpload, isLoading = false, open = true, handleOpenPopUp, handleClosePopUp }: Props) {
  const { moduleId } = useParams()
  const [downloading, setDownloading] = useState(false)
  const downloadFormat = async () => {
    setDownloading(true)
    try {
      await downloadImportFormat(moduleId)
      toast.success('Import Format Downloaded Successfully')
    } catch (e) {
      console.error(e)
      toast.error('Failed to Downloaded Import Format')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClosePopUp()}>
      <DialogTrigger className=" px-2 rounded-md text-sm font-semibold cursor-pointer bg-white hover:bg-gray-100 text-[#21496B]" onClick={handleOpenPopUp}>
        <span className="md:inline sm:hidden inline">Import CSV</span> <FileUp className="hidden md:hidden sm:inline" />
      </DialogTrigger>
      <DialogContent className="min-w-[min(60vw,800px)] p-0 border-none ring-0 max-h-screen gap-1.5" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="p-2 text-xl bg-[#21496B] rounded-lg text-white text-center">Upload CSV</DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>
        <div className=" w-full ">
          <div className="space-y-2">
            <div className="w-[90%] m-auto bg-blue-100 p-3 rounded-md space-y-2 text-gray-800 typo-basic-2 overflow-auto lg:h-fit h-40">
              <p>Read the instructions carefully before uploading the CSV file :</p>
              <ul className="list-disc pl-6 typo-basic-2">
                <li>
                  <span className="flex md:flex-row flex-col justify-start md:items-center items-start">
                    Upload the CSV file in the specified format.
                    <LoadingButton
                      variant="ghost"
                      title="[Download format here]."
                      handleClick={downloadFormat}
                      className="text-blue-500 hover:text-blue-500/80 pl-2 hover:bg-transparent bg-transparent cursor-pointer"
                      loading={downloading}
                      loadingText="[Downloading format]"
                    />
                  </span>
                </li>
                <li> Ensure the file size does not exceed the 5MB limit.</li>
                <li>All required fields must be filled; no empty fields are allowed.</li>
                <li> Avoid duplicate entries in the file.</li>
                <li>Remove any special characters or formatting inconsistencies.</li>
                <li>If the upload fails, review the error message and make necessary corrections.</li>
                <li>Ensure the file adheres to the required format before retrying.</li>
              </ul>
            </div>
            <div />
            <div className="w-[90%] m-auto bg-blue-100 xl:p-3 p-0 rounded-md border-gray-400 border-2 border-dashed ">
              <FileDrop accept=".csv,application/csv,text/csv" acceptedFileTypes={['csv']} onFileUpload={setSelectedImportFile} />
            </div>
            <div />
            <div className={cn('w-[90%] m-auto text-gray-800 space-y-1 typo-basic-2', selectedImportFile === null ? 'invisible' : 'visible')}>
              <p>Uploaded</p>
              <div className="flex items-center w-full justify-between text-xs ring-green-400 ring-2 rounded-sm px-2 p-1">
                <span>{selectedImportFile?.name}</span>
                <button className="cursor-pointer" onClick={() => setSelectedImportFile(null)}>
                  <img src={deleteIcon} alt="Delete" width="14" />
                </button>
              </div>
            </div>
            <div />
          </div>
        </div>
        <div className="flex gap-2 pb-3 justify-center items-center">
          <DialogClose asChild>
            <Button type="button" variant="ghost" onClick={handleClosePopUp} className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton title="Upload" handleClick={handleMediaUpload} loading={isLoading} variant="btnBlue" type="submit" disabled={!selectedImportFile} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
