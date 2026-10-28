"""Project Schedule -> summary.projectScheduleData {schedules, sections, uploadedImages}"""
from datetime import date
from .cs_common import header_rects, read_table

DEFAULT_SECTIONS = ['Residential', 'Retail', 'Parking', 'Common']


def days_between(a, b):
    try:
        d = (date.fromisoformat(b) - date.fromisoformat(a)).days
        return d if d >= 0 else ''
    except Exception:
        return ''


def parse(pages, ctx):
    schedules, sections = [], []
    nid = 1
    for p in pages:
        if not header_rects(p):
            continue
        labels, rows = read_table(p)
        if labels and labels[0].startswith('Task'):
            for r in rows:
                c = r['cells'] + [''] * 4
                name = c[0]
                if name.startswith('  — '):
                    if schedules:
                        schedules[-1]['subTasks'].append(dict(id=nid, task=name[4:], duration=c[1], start=c[2], finish=c[3])); nid += 1
                    continue
                schedules.append(dict(id=nid, task=name, duration=c[1], start=c[2], finish=c[3], expanded=True, subTasks=[])); nid += 1
        elif labels and labels[0].startswith('Phase'):
            for r in rows:
                c = r['cells'] + [''] * 5
                d = days_between(c[1], c[2])
                sections.append(dict(id=len(sections) + 1, name=c[0], start=c[1], finish=c[2], days=str(d) if d != '' else '', durationMonths=c[3], structureMonths=c[4]))
    if not schedules and not sections:
        return {'summary': {}, 'notes': ['no schedule configured']}
    names = [s['name'] for s in sections]
    if sections and all(n in DEFAULT_SECTIONS for n in names):
        for n in DEFAULT_SECTIONS:
            if n not in names:
                sections.append(dict(id=len(sections) + 1, name=n, start='', finish='', days='', durationMonths='', structureMonths=''))
        order = {n: i for i, n in enumerate(DEFAULT_SECTIONS)}
        sections.sort(key=lambda s: order[s['name']])
        for i, s in enumerate(sections): s['id'] = i + 1
    if not sections:
        sections = [dict(id=i + 1, name=n, start='', finish='', days='', durationMonths='', structureMonths='') for i, n in enumerate(DEFAULT_SECTIONS)]
    return {'summary': {'projectScheduleData': {'schedules': schedules, 'sections': sections, 'uploadedImages': []}},
            'notes': ['schedule images are not printed in the DPR, so any uploaded schedule images cannot be recovered']}
