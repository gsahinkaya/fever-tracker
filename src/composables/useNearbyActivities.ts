import { ref } from 'vue'
import { getCurrentPosition, haversineKm } from '@/lib/geolocation'

export interface NearbyActivity {
  id: string
  name: string
  category: string
  lat: number
  lon: number
  address: string
  phone?: string
  website?: string
  openingHours?: string
  distanceKm: number
}

// Overpass (OpenStreetMap) tag → Turkish label shown in the UI. Deliberately
// excludes generic tags like leisure=park/playground — there are hundreds
// of those in any city and they'd drown out the actual "things to do"
// results this screen is for.
const CATEGORIES: { tag: string; value: string; label: string }[] = [
  { tag: 'amenity', value: 'cinema', label: 'Sinema' },
  { tag: 'amenity', value: 'theatre', label: 'Tiyatro' },
  { tag: 'tourism', value: 'zoo', label: 'Hayvanat Bahçesi' },
  { tag: 'tourism', value: 'aquarium', label: 'Akvaryum' },
  { tag: 'tourism', value: 'museum', label: 'Müze' },
  { tag: 'tourism', value: 'theme_park', label: 'Lunapark' },
  { tag: 'leisure', value: 'amusement_arcade', label: 'Oyun Salonu' },
  { tag: 'leisure', value: 'bowling_alley', label: 'Bowling' },
]
const RADIUS_METERS = 10_000
const MAX_RESULTS = 30

function buildOverpassQuery(lat: number, lon: number): string {
  const clauses = CATEGORIES.flatMap(({ tag, value }) => [
    `node["${tag}"="${value}"](around:${RADIUS_METERS},${lat},${lon});`,
    `way["${tag}"="${value}"](around:${RADIUS_METERS},${lat},${lon});`,
  ]).join('\n  ')
  // No numeric limit here: Overpass's "out N" caps by OSM id order, not by
  // distance, so capping server-side risks silently dropping genuinely
  // closer results in a dense area. Fetch everything in the radius and
  // truncate client-side after sorting by actual distance instead.
  return `[out:json][timeout:25];\n(\n  ${clauses}\n);\nout center tags;`
}

interface OverpassElement {
  type: 'node' | 'way'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:street'] &&
      `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}`,
    tags['addr:neighbourhood'],
    tags['addr:district'],
  ].filter((p): p is string => !!p)
  return parts.join(', ')
}

function categoryFor(tags: Record<string, string>): string | null {
  for (const { tag, value, label } of CATEGORIES) {
    if (tags[tag] === value) return label
  }
  return null
}

export function useNearbyActivities() {
  const loading = ref(false)
  const error = ref<'permission' | 'location' | 'fetch' | null>(null)
  const activities = ref<NearbyActivity[]>([])

  async function load() {
    loading.value = true
    error.value = null
    activities.value = []

    let lat: number, lon: number
    try {
      const position = await getCurrentPosition()
      lat = position.coords.latitude
      lon = position.coords.longitude
    } catch (err) {
      error.value =
        err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
          ? 'permission'
          : 'location'
      loading.value = false
      return
    }

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(buildOverpassQuery(lat, lon))}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) throw new Error('fetch-failed')
      const data = (await res.json()) as { elements: OverpassElement[] }

      activities.value = data.elements
        .map((el): NearbyActivity | null => {
          const tags = el.tags ?? {}
          const name = tags.name
          const category = categoryFor(tags)
          const pos = el.type === 'node' ? { lat: el.lat!, lon: el.lon! } : el.center
          if (!name || !category || !pos) return null
          return {
            id: '',
            name,
            category,
            lat: pos.lat,
            lon: pos.lon,
            address: formatAddress(tags),
            phone: tags.phone ?? tags['contact:phone'],
            website: tags.website ?? tags['contact:website'],
            openingHours: tags.opening_hours,
            distanceKm: haversineKm(lat, lon, pos.lat, pos.lon),
          }
        })
        .filter((a): a is NearbyActivity => a !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, MAX_RESULTS)
        .map((a, i) => ({ ...a, id: String(i) }))
    } catch {
      error.value = 'fetch'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, activities, load }
}
