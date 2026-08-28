import { ref } from 'vue'
import { getCurrentPosition, haversineKm } from '@/lib/geolocation'
import { auth } from '@/firebase'

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

// Overpass (OpenStreetMap) tag → Turkish label shown in the UI. No OSM tag
// means "kid-friendly", so this list is a judgment call, not a real
// filter. Theatre/museum were dropped once (skew adult: opera houses,
// fine-art museums) then restored after user feedback that it was cutting
// out well-known, worthwhile venues (e.g. a city cultural center) —
// losing those false negatives mattered more than the occasional
// adult-programming result. amusement_arcade (pool halls, generic game
// rooms) was dropped instead as the actually low-value category.
// leisure=park is still excluded (hundreds per city, not really a "thing
// to do"); leisure=playground is included but capped separately (see
// PLAYGROUND_LIMIT) for the same reason.
const CATEGORIES: { tag: string; value: string; label: string }[] = [
  { tag: 'amenity', value: 'cinema', label: 'Sinema' },
  { tag: 'amenity', value: 'theatre', label: 'Tiyatro' },
  { tag: 'tourism', value: 'zoo', label: 'Hayvanat Bahçesi' },
  { tag: 'tourism', value: 'aquarium', label: 'Akvaryum' },
  { tag: 'tourism', value: 'museum', label: 'Müze' },
  { tag: 'tourism', value: 'theme_park', label: 'Lunapark' },
  { tag: 'leisure', value: 'water_park', label: 'Su Parkı' },
  { tag: 'leisure', value: 'bowling_alley', label: 'Bowling' },
  { tag: 'leisure', value: 'playground', label: 'Oyun Alanı' },
]
const MAX_RESULTS = 30
// Playgrounds are dense enough (often several per neighborhood) that
// letting them compete on pure distance would crowd out the rarer,
// higher-value results (a zoo, a water park) from the rest of the list.
const PLAYGROUND_LIMIT = 5

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
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch(
        `/api/nearby-activities?lat=${lat}&lon=${lon}`,
        { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} },
      )
      if (!res.ok) throw new Error('fetch-failed')
      const data = (await res.json()) as { elements: OverpassElement[] }

      const parsed = data.elements
        .map((el): NearbyActivity | null => {
          const tags = el.tags ?? {}
          const category = categoryFor(tags)
          const pos = el.type === 'node' ? { lat: el.lat!, lon: el.lon! } : el.center
          // Most playgrounds carry no name in OSM (unlike a cinema/zoo,
          // which is a real business) — fall back to the category label
          // rather than dropping every unnamed one.
          const name = tags.name ?? (category === 'Oyun Alanı' ? category : null)
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

      const playgrounds = parsed.filter((a) => a.category === 'Oyun Alanı').slice(0, PLAYGROUND_LIMIT)
      const rest = parsed
        .filter((a) => a.category !== 'Oyun Alanı')
        .slice(0, MAX_RESULTS - playgrounds.length)
      activities.value = [...rest, ...playgrounds]
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map((a, i) => ({ ...a, id: String(i) }))
    } catch {
      error.value = 'fetch'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, activities, load }
}
