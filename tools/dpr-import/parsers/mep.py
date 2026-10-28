"""MEP department record (POST /mep): top-level field values + customFields {label: value}, status"""
from parsers._ls_common import empty_page, param_rows, custom_key

LIFT = {
    'No. Of Lifts': 'LiftsNo',
    'No. Of Stops': 'LiftsStops',
    'Speed Of Lift': 'LiftsSpeed',
    'Average Waiting Time': 'AverageWait',
    'Lift Size (Length)': 'LiftSizeLength',
    'Lift Size (Width)': 'LiftSizeWidth',
}
HVAC = {
    'AC Provision In Units': 'acProvisionUnits',
    'Air-Conditioned Area For Apartment': 'acAreaApartment',
    'Tonnage Per Apartment': 'tonnageApartment',
    'Cost Per Tonne Per Apartment': 'costPerTonneApartment',
    'Air-Conditioned Area For Club': 'acAreaClub',
    'Tonnage Of Club House': 'tonnageClub',
    'Cooling Efficiency (Apartment)': 'efficiencyApartment',
    'Cooling Efficiency (Club)': 'efficiencyClub',
}


def parse(pages, ctx):
    if not pages or empty_page(pages):
        return {'mep': None, 'notes': []}
    rec, custom = {}, {}
    for r in param_rows(pages):
        sec, label, value = r['section'], r['label'], r['value']
        if sec == 'Elevators (Passenger)' and label in LIFT:
            rec['passenger' + LIFT[label]] = value
        elif sec == 'Elevators (Service)' and label in LIFT:
            rec['service' + LIFT[label]] = value
        elif sec == 'HVAC' and label in HVAC:
            rec[HVAC[label]] = value
        else:
            custom[custom_key(label)] = value
    rec['customFields'] = custom
    rec['status'] = 'Submitted'
    return {'mep': rec, 'notes': []}
