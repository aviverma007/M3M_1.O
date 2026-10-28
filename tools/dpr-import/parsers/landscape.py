"""summary.landscapeAmenitiesData = { landscapeConfig, amenitiesList, landscapeData, selectedAmenities } (LandscapeAmenitiesForm shape)."""
import copy, re
from parsers._ls_common import FILL_RE, text, empty_page

# DEFAULT_LANDSCAPE_CONFIG / DEFAULT_AMENITIES from frontend/src/components/design-chapters-b/landscapeCatalogue.ts
DEFAULT_CONFIG = [
    {'category': 'Landscape Access & Connectivity', 'parameters': [
        {'name': 'accessTowerLobbies', 'label': 'Landscape Access from Tower Lobbies', 'type': 'switch'},
        {'name': 'accessClubhouse', 'label': 'Landscape Access from Clubhouse', 'type': 'switch'},
        {'name': 'typeOfAccess', 'label': 'Type of Access', 'type': 'select', 'options': ['Pedestrian', 'Mixed', 'Vehicular Only']},
        {'name': 'universalAccessibility', 'label': 'Universal Accessibility (PWD)', 'type': 'switch'}]},
    {'category': 'Landscape Planning', 'parameters': [
        {'name': 'landscapeZoning', 'label': 'Landscape Zoning', 'type': 'select', 'options': ['Single Zone', 'Multiple Zones']},
        {'name': 'typeOfLandscapeZones', 'label': 'Type of Landscape Zones', 'type': 'select', 'options': ['Active', 'Passive', 'Kids', 'Senior', 'Sports', 'Wellness', 'Community']},
        {'name': 'totalLandscapeArea', 'label': 'Total Landscape Area', 'type': 'input', 'unit': 'Sq.m'}]},
    {'category': 'Peripheral Green Belt', 'parameters': [
        {'name': 'greenBeltProvided', 'label': 'Green Belt Provided Along Periphery', 'type': 'switch'},
        {'name': 'greenBeltWidth', 'label': 'Green Belt Width', 'type': 'input', 'unit': 'm'},
        {'name': 'greenBeltPurpose', 'label': 'Green Belt Purpose', 'type': 'select', 'options': ['Buffer', 'Aesthetic', 'Services', 'Buffer + Services']},
        {'name': 'servicesInGreenBelt', 'label': 'Services Routed in Green Belt', 'type': 'switch'}]},
    {'category': 'Vehicular Circulation', 'parameters': [
        {'name': 'internalDrivewayWidth', 'label': 'Internal Driveway Width (Typical)', 'type': 'input', 'unit': 'm'},
        {'name': 'drivewayLocation', 'label': 'Driveway Location', 'type': 'select', 'options': ['Adjacent to Green Belt', 'Central', 'Peripheral', 'Mixed']},
        {'name': 'drivewayWidening', 'label': 'Driveway Widening at Tower Drop-offs', 'type': 'switch'},
        {'name': 'dropOffWidth', 'label': 'Drop-off Width (Max)', 'type': 'input', 'unit': 'm'}]},
    {'category': 'Fire & Safety Interface', 'parameters': [
        {'name': 'fireTenderAccess', 'label': 'Fire Tender Access Provided', 'type': 'switch'},
        {'name': 'turningRadiusComplied', 'label': 'Minimum Turning Radius Complied', 'type': 'switch'}]},
    {'category': 'Design Integration', 'parameters': [
        {'name': 'pedestrianSegregation', 'label': 'Pedestrian-Vehicular Segregation', 'type': 'switch'},
        {'name': 'landscapeInterface', 'label': 'Landscape Interface with Driveway', 'type': 'select', 'options': ['Soft', 'Hard', 'Mixed']}]},
    {'category': 'Documentation', 'parameters': [
        {'name': 'drawingReference', 'label': 'Drawing Reference', 'type': 'select', 'options': ['GA', 'Landscape', 'Circulation']},
        {'name': 'remarks', 'label': 'Remarks', 'type': 'input', 'unit': 'Free Text'}]},
]
DEFAULT_AMENITIES = [
    {'head': 'Club (Indoor/ Podium-linked)', 'items': ['Luxurious Lobby', 'All-Day Dining', 'Coffee Lounge', 'Bar', 'Sports Bar', 'Banquet', 'Business Centre/Meeting Rooms',
        'Business Centre/Spa', 'Gym', 'Creche', 'Changing Rooms', 'Outdoor Swimming Pool (Podium Level)', "Kids' Pool (Club)", 'Jacuzzi']},
    {'head': 'Sports (Outdoor/ Landscape Integrated)', 'items': ['Tenniz Courts', 'Pickleball Court', 'Padel Courts', 'Cricket Pitch', 'Football Court (8A size)', 'Putting Green',
        'Outdoor Gym/Corssfit Area', 'Joggng Track']},
    {'head': 'Wellness & Leisure (Landscape)', 'items': ['Yoga Terrace', 'Reflexology Garden', 'Elderly Garden', 'PetsPark', 'Bio Pond', 'Reflection Pond (with retention)',
        'Activity Lawn with Amphitheatre (Banquet Lawn)', 'Event Lawn']},
    {'head': 'Kids & Youth', 'items': ['Toddler Play Area', 'Young Adult Play Area', 'Water Play Area', 'Slide & Skating Rink']},
    {'head': 'Community/ Social spaces', 'items': ['Pavilion', 'Tree Pavilion', 'Temple Pavilion', 'Event Amphitheatre with Stage', 'BBQ Pits', 'Communal Plaza']},
    {'head': 'Landscape/ Green Features', 'items': ['Entry Plaza with Feature Tree', 'Allotment Organic Garden', 'Clubhouse Courtyard', 'Tower Courtyards']},
    {'head': 'Infrastructure & Connectivity', 'items': ['Tower Drop-offs with Arrival Feature Wall', 'Surface Parking', '7.5 m Fire Tender Path',
        'Communal Plaza & Jogging Track Integrated on 7.5 m width']},
]

CARD_W = 378.94


def _cards(pages):
    """parameter cards -> [(category, [(label, value)])]"""
    cards = []
    for p in pages:
        if 'Parameters' not in p.title:
            continue
        cur = row = None
        mode = None
        for l in p.ops:
            f = FILL_RE.match(l)
            if f and abs(float(f[3]) - CARD_W) < 0.5:
                fill = f[5]
                if fill == '#1A3566':
                    cur = {'x': float(f[1]), 'title': '', 'rows': []}
                    cards.append(cur)
                    mode = 'title'
                elif fill == '#DCE8F5':
                    mode = 'head'
                else:
                    row = {'label': [], 'value': []}
                    cur['rows'].append(row)
                    mode = 'row'
                continue
            t = text(l)
            if not t or not (62 < t['y'] < 570) or cur is None:
                continue
            if mode == 'title':
                cur['title'] += t['text']
            elif mode == 'row':
                (row['label'] if t['x'] < cur['x'] + CARD_W * 0.55 else row['value']).append(t['text'])
    return [(c['title'], [(''.join(r['label']), ''.join(r['value'])) for r in c['rows']]) for c in cards]


def _amenities(pages):
    """selected amenities pages -> [(head, [items])] in printed order"""
    groups = []
    for p in pages:
        if 'Selected Amenities' not in p.title:
            continue
        # items are drawn before their category cell; a category cell closes the block
        blocks, buf, cat_lines, mode = [], [], None, None
        for l in p.ops:
            f = FILL_RE.match(l)
            if f:
                x, fill = float(f[1]), f[5]
                if abs(x - 215) < 0.5:
                    if cat_lines is not None:
                        blocks.append((''.join(cat_lines), buf)); buf = []; cat_lines = None
                    buf.append([]); mode = 'item'
                elif abs(x - 35) < 0.5 and fill == '#EEF2F8':
                    cat_lines = []; mode = 'cat'
                else:
                    mode = None
                continue
            t = text(l)
            if not t or not (62 < t['y'] < 570):
                continue
            if mode == 'item':
                buf[-1].append(t['text'])
            elif mode == 'cat':
                cat_lines.append(t['text'])
        if cat_lines is not None:
            blocks.append((''.join(cat_lines), buf))
        for head, its in blocks:
            head = re.sub(r' \(cont\.\)$', '', head)
            names = [''.join(i) for i in its]
            if groups and groups[-1][0] == head:
                groups[-1][1].extend(names)
            else:
                groups.append((head, names))
    return groups


def _value(param, v):
    if param.get('type') == 'switch' and v in ('Yes', 'No'):
        return v == 'Yes'
    unit = param.get('unit')
    if unit and unit.lower() != 'free text' and v.endswith(' ' + unit):
        return v[: -len(unit) - 1]
    return v


def parse(pages, ctx):
    if not pages or empty_page(pages):
        return {'summary': {}, 'notes': []}
    notes = []
    config = copy.deepcopy(DEFAULT_CONFIG)
    values = {}
    for title, rows in _cards(pages):
        cat = next((c for c in config if c['category'] == title), None)
        if cat is None:
            cat = {'category': title, 'parameters': []}
            config.append(cat)
            notes.append(f'custom landscape category {title!r}')
        for label, v in rows:
            par = next((p for c in config for p in c['parameters'] if p['label'] == label and c is cat), None) or \
                  next((p for c in config for p in c['parameters'] if p['label'] == label), None)
            if par is None:
                name = 'custom_' + re.sub(r'[^a-z0-9]+', '_', label.lower()).strip('_')
                par = {'name': name, 'label': label, 'type': 'input'}
                cat['parameters'].append(par)
                notes.append(f'custom landscape parameter {label!r}')
            values[par['name']] = _value(par, v)

    groups = _amenities(pages)
    heads = []
    selected = []
    for head, items in groups:
        default = next((h for h in DEFAULT_AMENITIES if h['head'] == head), None)
        rest = [i for i in (default['items'] if default else []) if i not in items]
        heads.append({'head': head, 'items': items + rest})
        selected += items
    for h in DEFAULT_AMENITIES:
        if not any(x['head'] == h['head'] for x in heads):
            heads.append(copy.deepcopy(h))
    data = {'landscapeConfig': config, 'amenitiesList': heads, 'landscapeData': values, 'selectedAmenities': selected}
    return {'summary': {'landscapeAmenitiesData': data}, 'notes': notes}
