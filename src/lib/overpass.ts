// Shared by every "find nearby X" composable that queries OpenStreetMap's
// Overpass API server-side (see api/nearby-activities.ts and
// api/nearby-hospitals.ts) and parses the result client-side.
export interface OverpassElement {
  type: 'node' | 'way'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function overpassPosition(el: OverpassElement): { lat: number; lon: number } | undefined {
  return el.type === 'node' ? { lat: el.lat!, lon: el.lon! } : el.center
}

export function formatOverpassAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:street'] &&
      `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}`,
    tags['addr:neighbourhood'],
    tags['addr:district'],
  ].filter((p): p is string => !!p)
  return parts.join(', ')
}
