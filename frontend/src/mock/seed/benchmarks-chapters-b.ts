/** Benchmarks for the Landscape & Amenities parameters (checked via lib/benchmark like the original). */
import { registerBenchmarks } from '../seedHelpers'

registerBenchmarks([
  { label: 'Landscape Access from Tower Lobbies', benchmarkValue: 'Yes' },
  { label: 'Landscape Access from Clubhouse', benchmarkValue: 'Yes' },
  { label: 'Type of Access', benchmarkValue: 'Pedestrian', validOptions: ['Pedestrian', 'Mixed', 'Vehicular Only'] },
  { label: 'Universal Accessibility (PWD)', benchmarkValue: 'Yes' },
  { label: 'Landscape Zoning', benchmarkValue: 'Multiple Zones', validOptions: ['Single Zone', 'Multiple Zones'] },
  { label: 'Green Belt Provided Along Periphery', benchmarkValue: 'Yes' },
  { label: 'Green Belt Width', benchmarkValue: '3 m' },
  { label: 'Internal Driveway Width (Typical)', benchmarkValue: '6 m' },
  { label: 'Drop-off Width (Max)', benchmarkValue: '6 to 9 m' },
  { label: 'Fire Tender Access Provided', benchmarkValue: 'Yes' },
  { label: 'Minimum Turning Radius Complied', benchmarkValue: 'Yes' },
  { label: 'Pedestrian-Vehicular Segregation', benchmarkValue: 'Yes' },
  { label: 'Landscape Interface with Driveway', benchmarkValue: 'Soft', validOptions: ['Soft', 'Hard', 'Mixed'] },
])
