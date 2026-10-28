"""Approvals -> summary.approvalsData (rows with any date/remark are printed; the rest of the default list is restored empty)"""
from .cs_common import header_rects, read_table

DEFAULT = ['Land License', 'Zoning & Demarcation', 'Phasing Plan Approval', 'Joint Development Right Permission Approval',
           'Environment Clearance (EIA)', 'Consent to Establish (CTE)', 'Building Plan', 'RERA']


def parse(pages, ctx):
    rows = []
    for p in pages:
        if not header_rects(p):
            continue
        _, rs = read_table(p)
        rows += [r['cells'] for r in rs]
    if not rows:
        return {'summary': {}, 'notes': ['no approval timelines (form keeps its default list)']}
    keys = ['plannedSubmission', 'actualSubmission', 'plannedApproval', 'actualApproval', 'remarks']
    parsed = {c[0]: dict(zip(keys, c[1:6])) for c in rows}
    names = [n for n in DEFAULT] + [c[0] for c in rows if c[0] not in DEFAULT]
    out = []
    for i, n in enumerate(names):
        v = parsed.get(n, {})
        out.append(dict(id=i, type=n, **{k: v.get(k, '') for k in keys}))
    return {'summary': {'approvalsData': out}}
