/**
 * Key Ratio module seed (residential module 1, commercial module 101) + sample answers used by Compare Projects.
 *
 * Reference tables (field catalogues — would be master tables in SQL Server):
 *   keyRatioCalFields      residential calculated ratios
 *                          { id, field_name, tab, section, section_id, order_id, rupee_value, dependecy_fields[],
 *                            mid_end, premium, affluent (benchmark "min-max"), mid_end_range, premium_range, affluent_range }
 *   comKeyRatioInputs      commercial inputs   { id(field_id), field_name, units, tab, section, is_visible, order }
 *   comKeyRatioOutputs     commercial outputs  { id(field_id), field_name, units, tab, section, dependency[], is_visible,
 *                            hi_street, high_street, enclosed_mall, ... (benchmarks), *_range }
 * Per-project tables:
 *   keyRatios              { projectId, moduleId, fields: {<input key>: value}, outputs: {<calc id>: {value,is_flag,remark,calculated_cost}},
 *                            sectionCosts: [{section_id, section_cost}], isDraft }
 *   comKeyRatios           { projectId, moduleId, inputs: {<field_id>: value}, outputs: {<field_id>: {field_value,remark,is_flag,calculated_cost}},
 *                            sectionCost: [{section_name, section_cost}], isDraft }
 * All values are fictional sample data.
 */
import { registerSeed, type Db } from '../db'
import { ensureModuleWorkspaceCatalogue } from '../handlers/module-workspace'

/* ------------------------------------------------------------------ residential catalogue */

type Bench = [mid_end: string, premium: string, affluent: string]
type ResDef = [id: number, name: string, tab: string, section: string, deps: string[], bench: Bench, rupee: 0 | 1]

const RES_SECTIONS: Record<string, number> = {
  Efficiency: 1,
  'Apt Configuration/ Dimensions': 2,
  'Non-Apt Configuration': 3,
  'Non-Apt Efficiencies': 4,
  Coefficients: 5,
  General: 6,
  Lifts: 7,
  HVAC: 8,
}

const RESIDENTIAL_FIELDS: ResDef[] = [
  [1, 'Apartment Efficiency', 'Design', 'Efficiency', ['carpet_area', 'total_external_wall_area', 'balcony_area', 'saleable_area'], ['0.76-0.82', '0.75-0.8', '0.72-0.78'], 1],
  [2, 'Carpet Area/Saleable', 'Design', 'Efficiency', ['carpet_area', 'saleable_area'], ['0.64-0.7', '0.62-0.68', '0.6-0.66'], 1],
  [3, 'Balcony Area/Saleable Area', 'Design', 'Efficiency', ['balcony_area', 'saleable_area'], ['0.05-0.08', '0.06-0.1', '0.08-0.12'], 1],
  [4, 'BUA/Saleable', 'Design', 'Efficiency', ['built_up_area', 'saleable_area'], ['1.2-1.3', '1.25-1.35', '1.3-1.4'], 1],
  [5, 'Saleable/FAR', 'Design', 'Efficiency', ['saleable_area', 'far'], ['1.35-1.45', '1.3-1.4', '1.25-1.35'], 1],
  [6, 'Window to Area Ratio', 'Design', 'Efficiency', ['window_to_area_ratio'], ['12-20', '15-25', '20-30'], 1],
  [27, 'FAR Utilization', 'Design', 'Efficiency', ['far', 'permissible_far'], ['95-100', '95-100', '95-100'], 1],
  [7, 'floor to floor height for apartment', 'Design', 'Apt Configuration/ Dimensions', ['floor_to_floor_height_apt'], ['2.9-3', '3-3.15', '3.15-3.3'], 1],
  [10, 'Lobby/Corridor Width', 'Design', 'Non-Apt Configuration', ['lobby_corridor_width'], ['1.5-1.8', '1.8-2.2', '2-2.4'], 0],
  [11, 'Driveway Width (Basement)', 'Design', 'Non-Apt Configuration', ['driveway_width_basement'], ['5.5-6', '6-6.5', '6-7'], 0],
  [12, 'Floor to Floor Height for Ground Lobby', 'Design', 'Non-Apt Configuration', ['floor_to_floor_height_ground_lobby'], ['3.6-4.5', '4.2-6', '4.5-7.5'], 0],
  [13, 'floor to floor height for basement', 'Design', 'Non-Apt Configuration', ['floor_to_floor_height_basement_b1_b2'], ['3.3-3.5', '3.3-3.6', '3.5-3.9'], 1],
  [26, 'Clear Height (Basement)', 'Design', 'Non-Apt Configuration', ['clear_height'], ['2.4-2.6', '2.4-2.75', '2.6-3'], 0],
  [14, 'Parking Bay Size', 'Design', 'Non-Apt Configuration', ['car_length', 'car_width'], ['12.5-13.5', '12.5-13.75', '13-14.5'], 0],
  [15, 'Basement parking efficiency', 'Design', 'Non-Apt Efficiencies', ['total_parking_area', 'total_number_of_cars'], ['28-31', '27-30', '30-34'], 1],
  [16, 'Circulation Efficiency', 'Design', 'Non-Apt Efficiencies', ['circulation_area', 'far'], ['8-12', '10-15', '12-18'], 0],
  [19, 'Service Core Efficiency', 'Design', 'Non-Apt Efficiencies', ['service_shaft_area', 'far'], ['1.5-2.5', '2-3', '2.5-3.5'], 0],
  [17, 'Steel consumption (kg/sqft)', 'Structure', 'Coefficients', ['total_steel_reinforcement', 'built_up_area'], ['4.75-5.2', '0-7.5', '0-7.5'], 1],
  [18, 'Concrete consumption (cum/sqft)', 'Structure', 'Coefficients', ['total_concrete_consumption', 'built_up_area'], ['0-0.046', '0-0.046', '0-0.046'], 1],
  [8, 'Number of Basements', 'Structure', 'General', ['no_of_basements'], ['1-2', '1-3', '2-4'], 0],
  [9, 'Building Height', 'Structure', 'General', ['building_height'], ['0-75', '0-120', '0-150'], 0],
  [20, 'Passenger lift speed', 'MEP', 'Lifts', ['passenger_lift_speed'], ['1.75-2.5', '2.5-3.5', '3.5-4'], 1],
  [21, 'Service Lift Speed', 'MEP', 'Lifts', ['service_lift_speed'], ['1.5-2', '2-2.5', '2.5-3'], 1],
  [22, 'Average Waiting Time', 'MEP', 'Lifts', ['avg_waiting_time'], ['40-60', '30-50', '20-40'], 0],
  [23, 'Overall efficiency of cooling system(Apartment)', 'MEP', 'HVAC', ['air_conditioned_area_for_appartment', 'tonnage_per_appartment'], ['260-320', '250-300', '230-280'], 1],
  [24, 'Overall efficiency of cooling system(club)', 'MEP', 'HVAC', ['air_conditioned_area_for_club', 'tonnage_of_club_house'], ['230-280', '220-260', '200-250'], 1],
]

/** Input columns of a residential key ratio record, in display order (keys of keyRatioFields[0]). */
export const RESIDENTIAL_INPUT_KEYS = [
  'building_height', 'carpet_area', 'saleable_area', 'balcony_area', 'built_up_area', 'far', 'permissible_far', 'total_external_wall_area',
  'window_to_area_ratio', 'service_shaft_area', 'sales_price', 'construction_cost_on_bua',
  'floor_to_floor_height_apt', 'no_of_units', 'average_wall_area_interior_exterior_per_unit',
  'lobby_corridor_width', 'driveway_width_basement', 'floor_to_floor_height_ground_lobby', 'floor_to_floor_height_basement_b1_b2', 'clear_height',
  'average_wall_area_interior_exterior_per_basement', 'no_of_basements', 'car_length', 'car_width',
  'total_basement_area', 'circulation_area', 'total_parking_area', 'total_number_of_cars',
  'total_steel_reinforcement', 'total_concrete_consumption',
  'air_conditioned_area_for_appartment', 'tonnage_per_appartment', 'cost_per_tonne_apartment', 'no_of_apartments',
  'air_conditioned_area_for_club', 'tonnage_of_club_house', 'cost_per_tonne_club', 'no_of_clubs',
  'passenger_lift_speed', 'no_of_passanger_lift', 'service_lift_speed', 'no_of_service_lift', 'avg_waiting_time',
]

/** Backend-maintained cost constants stored on every record (hidden from the input panel). */
export const RESIDENTIAL_COST_DEFAULTS: Record<string, number> = {
  cost_of_apartment_wall_construction: 1800,
  cost_of_basement_wall_construction: 2200,
  revenue_per_extra_car_slot: 500000,
  cost_of_passenger_lift_3ms: 0.9,
  cost_of_passenger_lift_3_5ms: 1.2,
  cost_of_passenger_lift_4ms: 1.4,
  cost_of_service_lift_2_5ms: 0.66,
  cost_of_service_lift_3ms: 0.7,
  price_per_steel: 55,
  price_per_concrete: 5000,
}

type ResSample = { projectName: string; fields: Record<string, number>; flags?: Record<number, string> }

const RESIDENTIAL_SAMPLES: ResSample[] = [
  {
    projectName: 'Aurora Heights',
    fields: {
      building_height: 95, carpet_area: 52000, saleable_area: 80000, balcony_area: 6500, built_up_area: 104000, far: 60000, permissible_far: 62000,
      total_external_wall_area: 3600, window_to_area_ratio: 22, service_shaft_area: 1500, sales_price: 14500, construction_cost_on_bua: 4800,
      floor_to_floor_height_apt: 3.2, no_of_units: 640, average_wall_area_interior_exterior_per_unit: 380,
      lobby_corridor_width: 2, driveway_width_basement: 6, floor_to_floor_height_ground_lobby: 4.5, floor_to_floor_height_basement_b1_b2: 3.6,
      clear_height: 2.6, average_wall_area_interior_exterior_per_basement: 2400, no_of_basements: 2, car_length: 5.4, car_width: 2.5,
      total_basement_area: 42000, circulation_area: 7800, total_parking_area: 33000, total_number_of_cars: 1150,
      total_steel_reinforcement: 7700000, total_concrete_consumption: 46000,
      air_conditioned_area_for_appartment: 95, tonnage_per_appartment: 4, cost_per_tonne_apartment: 85000, no_of_apartments: 640,
      air_conditioned_area_for_club: 2500, tonnage_of_club_house: 130, cost_per_tonne_club: 85000, no_of_clubs: 1,
      passenger_lift_speed: 3.5, no_of_passanger_lift: 16, service_lift_speed: 2.5, no_of_service_lift: 8, avg_waiting_time: 45,
    },
    flags: { 7: 'Higher floor to floor height requested for the premium towers.' },
  },
  {
    projectName: 'Cedar Greens',
    fields: {
      building_height: 60, carpet_area: 30000, saleable_area: 45000, balcony_area: 2900, built_up_area: 55000, far: 32000, permissible_far: 33000,
      total_external_wall_area: 1800, window_to_area_ratio: 16, service_shaft_area: 640, sales_price: 8200, construction_cost_on_bua: 3600,
      floor_to_floor_height_apt: 2.95, no_of_units: 480, average_wall_area_interior_exterior_per_unit: 300,
      lobby_corridor_width: 1.6, driveway_width_basement: 5.8, floor_to_floor_height_ground_lobby: 4, floor_to_floor_height_basement_b1_b2: 3.45,
      clear_height: 2.5, average_wall_area_interior_exterior_per_basement: 1800, no_of_basements: 2, car_length: 5.2, car_width: 2.5,
      total_basement_area: 26000, circulation_area: 3200, total_parking_area: 21000, total_number_of_cars: 720,
      total_steel_reinforcement: 3300000, total_concrete_consumption: 26000,
      air_conditioned_area_for_appartment: 80, tonnage_per_appartment: 2.8, cost_per_tonne_apartment: 75000, no_of_apartments: 480,
      air_conditioned_area_for_club: 1600, tonnage_of_club_house: 70, cost_per_tonne_club: 75000, no_of_clubs: 1,
      passenger_lift_speed: 2.5, no_of_passanger_lift: 10, service_lift_speed: 2, no_of_service_lift: 5, avg_waiting_time: 50,
    },
  },
  {
    projectName: 'Skyline One',
    fields: {
      building_height: 130, carpet_area: 38500, saleable_area: 62000, balcony_area: 6200, built_up_area: 84000, far: 46000, permissible_far: 47000,
      total_external_wall_area: 2900, window_to_area_ratio: 26, service_shaft_area: 1300, sales_price: 21000, construction_cost_on_bua: 6500,
      floor_to_floor_height_apt: 3.3, no_of_units: 260, average_wall_area_interior_exterior_per_unit: 520,
      lobby_corridor_width: 2.2, driveway_width_basement: 6.5, floor_to_floor_height_ground_lobby: 6, floor_to_floor_height_basement_b1_b2: 3.95,
      clear_height: 2.9, average_wall_area_interior_exterior_per_basement: 2600, no_of_basements: 3, car_length: 5.5, car_width: 2.6,
      total_basement_area: 52000, circulation_area: 6400, total_parking_area: 30000, total_number_of_cars: 920,
      total_steel_reinforcement: 7600000, total_concrete_consumption: 41000,
      air_conditioned_area_for_appartment: 160, tonnage_per_appartment: 6.5, cost_per_tonne_apartment: 90000, no_of_apartments: 260,
      air_conditioned_area_for_club: 3400, tonnage_of_club_house: 160, cost_per_tonne_club: 90000, no_of_clubs: 1,
      passenger_lift_speed: 4, no_of_passanger_lift: 12, service_lift_speed: 2.5, no_of_service_lift: 6, avg_waiting_time: 30,
    },
    flags: { 13: 'Additional basement height for mechanical parking.' },
  },
]

/* ------------------------------------------------------------------ commercial catalogue */

type ComIn = [id: number, name: string, units: string, tab: string, section: string]
const COMMERCIAL_INPUTS: ComIn[] = [
  [1, 'FAR Area', 'sq m', 'Design', 'Area Statement'],
  [35, 'Permissible FAR Area', 'sq m', 'Design', 'Area Statement'],
  [58, 'Total Saleable Area', 'sq m', 'Design', 'Area Statement'],
  [59, 'Office Saleable Area', 'sq m', 'Design', 'Area Statement'],
  [60, 'Retail Saleable Area', 'sq m', 'Design', 'Area Statement'],
  [52, 'Office FAR Area', 'sq m', 'Design', 'Area Statement'],
  [53, 'Retail FAR Area', 'sq m', 'Design', 'Area Statement'],
  [2, 'Retail Carpet Area', 'sq m', 'Design', 'Area Statement'],
  [3, 'Office Carpet Area', 'sq m', 'Design', 'Area Statement'],
  [71, 'Total Carpet Area', 'sq m', 'Design', 'Area Statement'],
  [42, 'Built Up Area', 'sq m', 'Design', 'Area Statement'],
  [4, 'Basement Area', 'sq m', 'Design', 'Area Statement'],
  [6, 'Common Area', 'sq m', 'Design', 'Area Statement'],
  [61, 'Office Sales Price', '₹/sqft', 'Design', 'Commercials'],
  [62, 'Retail Sales Price', '₹/sqft', 'Design', 'Commercials'],
  [63, 'Construction Cost on BUA', '₹/sqft', 'Design', 'Commercials'],
  [72, 'Ground Floor Sales Price', '₹/sqft', 'Design', 'Commercials'],
  [12, 'Ground Floor Loading Factor', '', 'Design', 'Commercials'],
  [56, 'Permissible Ground Coverage (% of site area)', '%', 'Design', 'Commercials'],
  [73, 'Site Area', 'sq m', 'Design', 'Commercials'],
  [74, 'Saleable Ground Coverage Area', 'sq m', 'Design', 'Commercials'],
  [11, 'Total Parking Area', 'sq m', 'Design', 'Parking & Basement'],
  [17, 'Total Number of Cars', '', 'Design', 'Parking & Basement'],
  [44, 'Revenue per Extra Car Slot', '₹', 'Design', 'Parking & Basement'],
  [5, 'Floor to Floor Height (Basement)', 'm', 'Design', 'Parking & Basement'],
  [48, 'Average Wall Area per Basement', 'sq m', 'Design', 'Parking & Basement'],
  [49, 'Number of Basements', '', 'Design', 'Parking & Basement'],
  [45, 'Cost of Basement Wall Construction', '₹/sq m', 'Design', 'Parking & Basement'],
  [41, 'Building Height', 'm', 'Structure', 'Structure'],
  [14, 'Total Steel Reinforcement', 'kg', 'Structure', 'Structure'],
  [15, 'Total Concrete Consumption', 'cum', 'Structure', 'Structure'],
  [46, 'Price of Steel', '₹/kg', 'Structure', 'Structure'],
  [47, 'Price of Concrete', '₹/cum', 'Structure', 'Structure'],
  [7, 'Passenger Lift Speed (Retail)', 'm/s', 'MEP', 'Lifts'],
  [67, 'No. of Passenger Lifts (Retail)', '', 'MEP', 'Lifts'],
  [68, 'Cost of Passenger Lift 3 m/s', 'Cr', 'MEP', 'Lifts'],
  [69, 'Cost of Passenger Lift 3.5 m/s', 'Cr', 'MEP', 'Lifts'],
  [70, 'Cost of Passenger Lift 4 m/s', 'Cr', 'MEP', 'Lifts'],
  [8, 'Service Lift Speed (Retail)', 'm/s', 'MEP', 'Lifts'],
  [64, 'No. of Service Lifts (Retail)', '', 'MEP', 'Lifts'],
  [65, 'Cost of Service Lift 2.5 m/s', 'Cr', 'MEP', 'Lifts'],
  [66, 'Cost of Service Lift 3 m/s', 'Cr', 'MEP', 'Lifts'],
  [9, 'Passenger Lift Speed (Office)', 'm/s', 'MEP', 'Lifts'],
  [81, 'No. of Passenger Lifts (Office)', '', 'MEP', 'Lifts'],
  [84, 'Cost of Office Passenger Lift 3 m/s', 'Cr', 'MEP', 'Lifts'],
  [85, 'Cost of Office Passenger Lift 3.5 m/s', 'Cr', 'MEP', 'Lifts'],
  [86, 'Cost of Office Passenger Lift 4 m/s', 'Cr', 'MEP', 'Lifts'],
  [10, 'Service Lift Speed (Office)', 'm/s', 'MEP', 'Lifts'],
  [80, 'No. of Service Lifts (Office)', '', 'MEP', 'Lifts'],
  [82, 'Cost of Office Service Lift 2.5 m/s', 'Cr', 'MEP', 'Lifts'],
  [83, 'Cost of Office Service Lift 3 m/s', 'Cr', 'MEP', 'Lifts'],
  [16, 'Air Conditioned Area (Retail)', 'sq m', 'MEP', 'HVAC'],
  [43, 'Tonnage (Retail)', 'tonne', 'MEP', 'HVAC'],
  [50, 'Cost per Tonne (Retail)', '₹', 'MEP', 'HVAC'],
  [79, 'Air Conditioned Area (Office)', 'sq m', 'MEP', 'HVAC'],
  [77, 'Tonnage (Office)', 'tonne', 'MEP', 'HVAC'],
  [78, 'Cost per Tonne (Office)', '₹', 'MEP', 'HVAC'],
]

type ComBench = [hi_street: string, enclosed_mall: string]
type ComOut = [id: number, name: string, units: string, tab: string, section: string, dependency: number[], bench: ComBench]
const COMMERCIAL_OUTPUTS: ComOut[] = [
  [1, 'Retail Carpet Efficiency', '%', 'Design', 'Area efficiencies', [2, 53], ['68-78', '65-75']],
  [2, 'Office Carpet Efficiency', '%', 'Design', 'Area efficiencies', [3, 52], ['70-78', '70-78']],
  [3, 'Basement Area/BUA', '%', 'Design', 'Area efficiencies', [4, 42], ['20-30', '25-35']],
  [4, 'Common Area/FAR', '%', 'Design', 'Area efficiencies', [6, 1], ['8-14', '10-15']],
  [26, 'FAR Utilization', '%', 'Design', 'Area efficiencies', [1, 35], ['95-100', '95-100']],
  [31, 'Saleable/FAR', '', 'Design', 'Area efficiencies', [58, 1], ['1.4-1.55', '1.45-1.55']],
  [32, 'Saleable/Office FAR', '', 'Design', 'Area efficiencies', [58, 52], ['3.5-4.5', '3.5-4']],
  [33, 'Saleable/Retail FAR', '', 'Design', 'Area efficiencies', [58, 53], ['2.2-2.8', '2.4-2.6']],
  [37, 'BUA/Saleable', '', 'Design', 'Area efficiencies', [42, 58], ['1.2-1.3', '1.25-1.35']],
  [38, 'BUA/Office Saleable', '', 'Design', 'Area efficiencies', [42, 59], ['3-3.5', '3-3.5']],
  [39, 'BUA/Retail Saleable', '', 'Design', 'Area efficiencies', [42, 60], ['1.9-2.3', '2-2.4']],
  [41, 'Carpet/Saleable', '', 'Design', 'Area efficiencies', [71, 58], ['0.45-0.55', '0.45-0.55']],
  [6, 'Ground Floor Loading Factor', '', 'Design', 'Ground Coverage', [12], ['1.3-1.45', '1.3-1.45']],
  [30, 'Saleable Ground Coverage', '%', 'Design', 'Ground Coverage', [74, 73], ['35-40', '35-40']],
  [8, 'Basement Parking Efficiency', 'sq m per car', 'Design', 'Parking & Basement', [11, 17], ['28-32', '30-33']],
  [16, 'Floor to Floor Height (Basement)', 'm', 'Design', 'Parking & Basement', [5], ['3.6-4.2', '3.6-4.2']],
  [17, 'Steel Consumption', 'kg/sqft', 'Structure', 'Coefficients', [14, 42], ['6.2-7', '6.2-7']],
  [18, 'Concrete Consumption', 'cum/sqft', 'Structure', 'Coefficients', [15, 42], ['0-0.042', '0-0.042']],
  [19, 'Passenger Lift Speed (Retail)', 'm/s', 'MEP', 'Lifts', [7], ['1.75-2.5', '2-2.5']],
  [20, 'Service Lift Speed (Retail)', 'm/s', 'MEP', 'Lifts', [8], ['1.5-2', '1.5-2']],
  [42, 'Passenger Lift Speed (Office)', 'm/s', 'MEP', 'Lifts', [9], ['2.5-3.5', '2.5-3.5']],
  [43, 'Service Lift Speed (Office)', 'm/s', 'MEP', 'Lifts', [10], ['2-2.5', '2-2.5']],
  [22, 'Cooling Efficiency (Retail)', 'sq ft/tonne', 'MEP', 'HVAC', [16, 43], ['220-260', '220-260']],
  [44, 'Cooling Efficiency (Office)', 'sq ft/tonne', 'MEP', 'HVAC', [79, 77], ['280-320', '280-320']],
]

type ComSample = { projectName: string; inputs: Record<number, number>; flags?: Record<number, string> }
const COMMERCIAL_SAMPLES: ComSample[] = [
  {
    projectName: 'The Atrium Mall',
    inputs: {
      1: 50000, 35: 52000, 58: 75000, 59: 30000, 60: 45000, 52: 20000, 53: 30000, 2: 21000, 3: 14500, 71: 35500, 42: 98000, 4: 30000, 6: 7000,
      61: 9500, 62: 16000, 63: 4200, 72: 22000, 12: 1.35, 56: 40, 73: 20000, 74: 7600,
      11: 22000, 17: 700, 44: 500000, 5: 4.3, 48: 2500, 49: 2, 45: 4000,
      41: 45, 14: 6800000, 15: 40000, 46: 55, 47: 5000,
      7: 2.5, 67: 12, 68: 0.9, 69: 1.2, 70: 1.4, 8: 2, 64: 6, 65: 0.66, 66: 0.7,
      9: 3, 81: 8, 84: 0.9, 85: 1.2, 86: 1.4, 10: 2.5, 80: 4, 82: 0.66, 83: 0.7,
      16: 45000, 43: 2000, 50: 90000, 79: 30000, 77: 1100, 78: 90000,
    },
    flags: { 16: 'Higher basement for mechanical services clearance.' },
  },
  {
    projectName: 'Market Street',
    inputs: {
      1: 32000, 35: 33500, 58: 47000, 59: 15000, 60: 32000, 52: 10000, 53: 22000, 2: 16000, 3: 7400, 71: 23400, 42: 59000, 4: 14000, 6: 3500,
      61: 8800, 62: 14500, 72: 19500, 63: 3900, 12: 1.4, 56: 40, 73: 14000, 74: 5300,
      11: 13500, 17: 450, 44: 450000, 5: 3.9, 48: 1900, 49: 1, 45: 4000,
      41: 30, 14: 4100000, 15: 25500, 46: 55, 47: 5000,
      7: 2, 67: 8, 68: 0.9, 69: 1.2, 70: 1.4, 8: 1.75, 64: 4, 65: 0.66, 66: 0.7,
      9: 2.5, 81: 4, 84: 0.9, 85: 1.2, 86: 1.4, 10: 2, 80: 2, 82: 0.66, 83: 0.7,
      16: 30000, 43: 1350, 50: 85000, 79: 14000, 77: 520, 78: 85000,
    },
  },
]

/* ------------------------------------------------------------------ seeding */

const MARKER = 'keyRatioCompareSeed'

function seedCatalogue(db: Db) {
  RESIDENTIAL_FIELDS.forEach(([id, field_name, tab, section, deps, [mid_end, premium, affluent], rupee_value], i) =>
    db.table('keyRatioCalFields').insert({
      id,
      field_name,
      tab,
      section,
      section_id: RES_SECTIONS[section],
      order_id: i + 1,
      rupee_value,
      dependecy_fields: deps,
      dependency_fields: deps,
      mid_end,
      premium,
      affluent,
      mid_end_range: 'NA',
      premium_range: 'NA',
      affluent_range: 'NA',
    }),
  )
  COMMERCIAL_INPUTS.forEach(([id, field_name, units, tab, section], i) =>
    db.table('comKeyRatioInputs').insert({ id, field_name, units, tab, section, is_visible: true, order: i + 1 }),
  )
  COMMERCIAL_OUTPUTS.forEach(([id, field_name, units, tab, section, dependency, [hi, mall]], i) =>
    db.table('comKeyRatioOutputs').insert({
      id,
      field_name,
      units,
      tab,
      section,
      dependency,
      is_visible: true,
      order: i + 1,
      hi_street: hi,
      high_street: hi,
      enclosed_mall: mall,
      mid_end: null,
      premium: null,
      affluent: null,
      hi_street_range: 'NA',
      high_street_range: 'NA',
      enclosed_mall_range: 'NA',
    }),
  )
}

function seedSamples(db: Db) {
  const projects = db.table('projects').all()
  const byName = (n: string) => projects.find((p) => p.name === n)
  RESIDENTIAL_SAMPLES.forEach((s) => {
    const p = byName(s.projectName)
    if (!p) return
    const outputs: Record<number, { is_flag: number; remark: string }> = {}
    Object.entries(s.flags ?? {}).forEach(([id, remark]) => (outputs[Number(id)] = { is_flag: 1, remark }))
    db.table('keyRatios').insert({ projectId: p.id, moduleId: 1, fields: { ...s.fields, ...RESIDENTIAL_COST_DEFAULTS }, outputs, sectionCosts: [], isDraft: false })
  })
  COMMERCIAL_SAMPLES.forEach((s) => {
    const p = byName(s.projectName)
    if (!p) return
    const outputs: Record<number, { is_flag: boolean; remark: string }> = {}
    Object.entries(s.flags ?? {}).forEach(([id, remark]) => (outputs[Number(id)] = { is_flag: true, remark }))
    db.table('comKeyRatios').insert({ projectId: p.id, moduleId: 101, inputs: s.inputs, outputs, sectionCost: [], isDraft: false })
  })
}

/**
 * Fill every chapter of a design module for a project with answers (benchmark answers for its category, with a few
 * deliberate deviations), so these projects are "complete" for Compare Projects. Uses the module-workspace tables.
 */
function seedChapterAnswers(db: Db, projectName: string, moduleId: number) {
  const p = db.table('projects').all().find((x) => x.name === projectName)
  if (!p) return
  const key = ({ premium: 'premiumAns', affluent: 'affluentAns', high_street: 'hiStreetAns', hi_street: 'hiStreetAns', enclosed_mall: 'enclosedMallAns' } as Record<string, string>)[String(p.category)] ?? 'midEndAns'
  const chapters = db.table('chapters').where((c) => c.moduleId === moduleId)
  if (!chapters.length || db.table('chapterFieldValues').first((v) => v.projectId === p.id && v.moduleId === moduleId)) return
  let n = 0
  chapters.forEach((ch) => {
    db.table('chapterSections')
      .where((s) => s.chapterId === ch.id)
      .forEach((s) =>
        db
          .table('sectionFields')
          .where((f) => f.sectionId === s.id)
          .forEach((f) => {
            const options = (f.options as string[]) ?? []
            const bench = ((f[key] as string[]) ?? []).filter((o) => o !== 'Any Other')
            const deviate = ++n % 9 === 0 && options.length > 1
            const pick = deviate ? (options.find((o) => !bench.includes(o) && o !== 'Any Other') ?? options[0]) : (bench[0] ?? options[0])
            db.table('chapterFieldValues').insert({
              projectId: p.id,
              moduleId,
              chapterId: ch.id,
              sectionId: s.id,
              sectionFieldId: f.id,
              answer: {
                answer: f.fieldType === 'multiselect' ? [pick] : pick,
                remark: deviate ? 'Aligned with the approved design brief.' : '',
                isFlaged: deviate ? 1 : 0,
                anyOtherAnswer: '',
                benchmarkAnswer: bench,
              },
            })
          }),
      )
    db.table('projectChapters').insert({ projectId: p.id, moduleId, chapterId: ch.id, status: 'completed' })
  })
}

registerSeed((db) => {
  if (db.table(MARKER).all().length) return
  db.table(MARKER).insert({ seeded: true })
  seedCatalogue(db)
  seedSamples(db)
  ensureModuleWorkspaceCatalogue(db)
  for (const name of ['Cedar Greens', 'Skyline One']) [2, 3].forEach((m) => seedChapterAnswers(db, name, m))
  for (const name of ['The Atrium Mall', 'Market Street']) seedChapterAnswers(db, name, 102)
})
