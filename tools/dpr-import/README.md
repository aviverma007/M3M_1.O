# DPR import tool

Turns DPR PDFs exported from the original (vendor) application into import folders for
`backend/scripts/import-project.mjs`, and checks the result by re-rendering with our DPR generator.

    python3 build.py <report.pdf> <out-folder> --project-json '{"locationCategory":"M3M Noida"}'

- `out-folder/data.json` + `images/` is one project's import folder.
- `roundtrip.txt` lists every page that differs from the original after re-rendering (0 diff lines = identical).
- One parser per module in `parsers/` (output uses the same shapes the app's forms store).
- Needs Python 3 with `pypdf`, `pdfplumber`, `fonttools`, `Pillow`, and `npx tsx` in `backend/` for the round trip.

Project data (the import folders) is real company data — keep it out of git (see .gitignore).
