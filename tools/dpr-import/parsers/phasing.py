"""Phasing Plan. None of the reference reports contain phasing pages (the original prints nothing when no phase
is configured), so the parser returns nothing when there are no pages and records a note otherwise."""


def parse(pages, ctx):
    if not pages:
        return {}
    return {'notes': [f'{len(pages)} phasing page(s) found but no phasing layout is known from the references; not imported']}
