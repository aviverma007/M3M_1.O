"""summary.serviceDesignData = {<param name>: value}; switches stored as booleans (as ServiceDesignForm saves them)."""
from parsers._ls_common import empty_page, param_rows

# report label -> (param name, type)  (labels from components/design-chapters-b/serviceCatalogue.ts; "Fire Tower" as printed)
PARAMS = {
    'Main Entry Type': ('mainEntryType', 'select'),
    'Internal Driveway Width': ('internalDrivewayWidth', 'input'),
    'Driveway Serving': ('drivewayServing', 'select'),
    'No. of Ramps Provided': ('noOfRamps', 'input'),
    'Cars per Ramp': ('carsPerRamp', 'input'),
    'Inward Ramp Provided': ('inwardRamp', 'switch'),
    'Outward Ramp Provided': ('outwardRamp', 'switch'),
    'Ramp Serving': ('rampServing', 'select'),
    'Ramp Slope Compliant with Codes': ('rampSlopeCompliant', 'switch'),
    'Primary Tower Drop-off Provided': ('primaryDropOff', 'switch'),
    'Users Allowed at Drop-off': ('usersAllowedAtDropOff', 'select'),
    'Vehicle Types Allowed': ('vehicleTypesAllowed', 'select'),
    'Drop-off Level Options': ('dropOffLevelOptions', 'select'),
    'Basement Access Control Provided': ('basementAccessControl', 'switch'),
    'Type of Access Control': ('typeOfAccessControl', 'select'),
    'Visitor Restriction at Basement': ('visitorRestriction', 'switch'),
    'Fire Tower': ('fireTower', 'select'),
    'Fire Tower Configuration': ('fireTower', 'select'),
    'Fire Lift Provided': ('fireLiftProvided', 'switch'),
    'Fire Lobby Provided': ('fireLobbyProvided', 'switch'),
    'Fire Lift Used as Service Lift': ('fireLiftAsService', 'switch'),
    "Driver's Rooms Provided": ('driversRooms', 'switch'),
    'Toilets for Service Personnel': ('serviceToilets', 'switch'),
    'Service Facilities Location': ('serviceFacilitiesLocation', 'select'),
}


def parse(pages, ctx):
    if not pages or empty_page(pages):
        return {'summary': {}, 'notes': []}
    data, notes = {}, []
    for r in param_rows(pages):
        p = PARAMS.get(r['label'])
        if not p:
            notes.append(f'unknown service design parameter {r["label"]!r} = {r["value"]!r} (not imported)')
            continue
        name, typ = p
        v = r['value']
        if typ == 'switch' and v in ('Yes', 'No'):
            v = v == 'Yes'
        data[name] = v
    return {'summary': {'serviceDesignData': data}, 'notes': notes}
