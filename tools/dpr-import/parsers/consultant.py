"""Consultant Strategy -> summary.consultantStrategyData"""
from .cs_common import header_rects, read_table


def parse(pages, ctx):
    rows = []
    for p in pages:
        if not header_rects(p):
            continue  # "Consultant Strategy" empty state
        _, rs = read_table(p)
        rows += rs
    if not rows:
        return {'summary': {}, 'notes': ['no consultants configured (form will show its default list)']}
    data = [dict(id=i + 1, type=c[0], name=c[1], status=c[2], plannedDate=c[3], actualDate=c[4], remarks=c[5])
            for i, c in enumerate(r['cells'] + [''] * (6 - len(r['cells'])) for r in rows)]
    return {'summary': {'consultantStrategyData': data}}
