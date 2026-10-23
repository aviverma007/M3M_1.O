/**
 * Benchmark rows for the chapters-a pages (Structure, MEP, Project / Unit Level Design).
 * Labels are the exact field labels the pages pass to the benchmark checker; `section` scopes
 * the MEP elevator rows like the original ("passenger elevators <label>").
 */
import { registerBenchmarks } from '../seedHelpers'

registerBenchmarks([
  /* ---------- Structure ---------- */
  { label: 'Tower Area - Non Typ. Floors', benchmarkValue: 'Conventional', validOptions: ['Conventional', 'Monolithic Aluminium', 'Tunnel Form', 'Mivan', 'Precast', 'Hybrid'] },
  { label: 'Tower Area - Typical Floors', benchmarkValue: 'Monolithic Aluminium', validOptions: ['Monolithic Aluminium', 'Conventional', 'Tunnel Form', 'Mivan', 'Precast', 'Hybrid'] },
  { label: 'NTA Formwork Type', benchmarkValue: 'Conventional', validOptions: ['Conventional', 'Monolithic Aluminium', 'Tunnel Form', 'Precast'] },
  { label: 'Earthquake Resistance', benchmarkValue: 'Seismic Zone IV', validOptions: ['Seismic Zone II', 'Seismic Zone III', 'Seismic Zone IV', 'Seismic Zone V'] },
  { label: 'Structural System', benchmarkValue: 'Shear Wall System', validOptions: ['Shear Wall System', 'Frame Structure', 'Flat Slab', 'Tube System', 'Hybrid'] },
  { label: 'Non-Tower Area Expansion Joints', benchmarkValue: 'No (Benchmark)', validOptions: ['Yes', 'No'] },
  { label: 'Design Execution', benchmarkValue: 'BIM + Tekla', validOptions: ['BIM + Tekla', 'BIM Only', 'CAD Only', 'Manual'] },
  { label: 'Max. Grade of Concrete', benchmarkValue: 'M40 to M60' },
  { label: 'Steel Consumption Coefficient', benchmarkValue: '4.5 to 5.5 kg/sq ft' },
  { label: 'Concrete Consumption Coefficient', benchmarkValue: '0.035 to 0.045 cum/sq ft' },

  /* ---------- MEP: elevators ---------- */
  { section: 'passenger elevators', label: 'No. Of Lifts', benchmarkValue: '4' },
  { section: 'passenger elevators', label: 'Speed Of Lift', benchmarkValue: '3 to 3.5 m/sec' },
  { section: 'passenger elevators', label: 'Average Waiting Time', benchmarkValue: '30 to 45 sec' },
  { section: 'service elevators', label: 'No. Of Lifts', benchmarkValue: '1' },
  { section: 'service elevators', label: 'Speed Of Lift', benchmarkValue: '1.75 to 2.5 m/sec' },
  { section: 'service elevators', label: 'Average Waiting Time', benchmarkValue: '45 to 60 sec' },
  /* ---------- MEP: HVAC ---------- */
  { label: 'AC Provision In Units', benchmarkValue: 'VRV/VRF', validOptions: ['VRV/VRF', 'Ductable', 'Split'] },
  { label: 'Cooling Efficiency - Apartment', benchmarkValue: '450 to 550 sq ft/Tonne' },
  { label: 'Cooling Efficiency - Club', benchmarkValue: '250 to 350 sq ft/Tonne' },
  { label: 'Tonnage Per Apartment', benchmarkValue: '8 to 14' },

  /* ---------- Project Level Design ---------- */
  { label: 'Building Height', benchmarkValue: '60 to 150 m' },
  { label: 'Floor to Floor Height Apt', benchmarkValue: '3.2 to 3.4 m' },
  { label: 'Lobby Corridor Width', benchmarkValue: '2 m' },
  { label: 'Driveway Width Basement', benchmarkValue: '6 m' },
  { label: 'Floor to Floor Height Ground Lobby', benchmarkValue: '4.5 to 6 m' },
  { label: 'BUA/Saleable', benchmarkValue: '1.15 to 1.25' },
  { label: 'Saleable/FAR', benchmarkValue: '1.35 to 1.45' },
  { label: 'FAR Utilization', benchmarkValue: '95 to 100 %' },
  { label: 'Balcony area/FAR (%)', benchmarkValue: '8 to 12 %' },
  { label: 'Basement parking efficiency', benchmarkValue: '30 to 35 sqm/car' },
  { label: 'Surface Driveway Width', benchmarkValue: '6 m' },
  { label: 'Basement Clear Height (Ramp Entrance)', benchmarkValue: '2.4 m' },

  /* ---------- Unit Level Design (efficiencies) ---------- */
  { label: 'CA/SA', benchmarkValue: '0.68 to 0.75' },
  { label: 'Balcony/SA', benchmarkValue: '8 to 12 %' },
  { label: 'Core Area Efficiency', benchmarkValue: '7 to 9 %' },
  { label: 'Unit Area (Covered + Balcony) to Saleable', benchmarkValue: '75 to 85 %' },
])
