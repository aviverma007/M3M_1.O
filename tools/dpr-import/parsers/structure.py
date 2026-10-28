"""Structure department record (POST /structure): { customFields: {<field>: value, dynamicInputs: [...]}, status }"""
from parsers._ls_common import empty_page, param_rows, custom_key

LABELS = {
    'Tower Area - Non Typical Floors': 'towerAreaNonTypical',
    'Tower Area - Typical Floors': 'towerAreaTypical',
    'NTA': 'nfa',
    'Commercial': 'commercial',
    'Earthquake Resistance': 'earthquakeResistance',
    'Structural System': 'structuralSystem',
    'Type Of Structure': 'typeOfStructure',
    'Type Of Construction': 'typeOfConstruction',
    'Non-Tower Area Expansion Joints': 'expansionJoints',
    'Design Execution': 'designExecution',
    'Max. Grade of Concrete': 'maxGradeOfConcrete',
    'Built Up Area': 'builtUpArea',
    'Steel Consumption Coefficient': 'steelConsumptionCoefficient',
    'Total Steel Consumption': 'totalSteelConsumption',
    'Concrete Consumption Coefficient': 'concreteConsumptionCoefficient',
    'Total Concrete Consumption': 'totalConcreteConsumption',
}
STD_SECTIONS = {'Proposed Formwork', 'Structural System Details', 'Material & Consumption'}


def parse(pages, ctx):
    if not pages or empty_page(pages):
        return {'structure': None, 'notes': []}
    cf, dyn, notes = {}, [], []
    for r in param_rows(pages):
        key = LABELS.get(r['label'])
        if key and (r['section'] in STD_SECTIONS):
            cf[key] = r['value']
        else:
            # custom inputs added on the Structure page (group = section band, '' when printed without one)
            group = r['section'] or ''
            dyn.append({'id': len(dyn) + 1, 'group': group, 'name': custom_key(r['label']), 'benchmark': r['req'] or '', 'value': r['value']})
    if dyn:
        cf['dynamicInputs'] = dyn
    return {'structure': {'customFields': cf, 'status': 'Submitted'}, 'notes': notes}
