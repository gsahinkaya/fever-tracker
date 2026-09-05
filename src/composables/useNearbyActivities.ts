import { ref } from 'vue'
import { getCurrentPosition, haversineKm } from '@/lib/geolocation'
import { type OverpassElement, formatOverpassAddress, overpassPosition } from '@/lib/overpass'
import { auth } from '@/firebase'
import { t } from '@/i18n'

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

// Overpass (OpenStreetMap) tag → i18n key (nearbyActivities.categories.*)
// shown in the UI. No OSM tag means "kid-friendly", so this list is a
// judgment call, not a real filter. Theatre/museum were dropped once (skew
// adult: opera houses, fine-art museums) then restored after user feedback
// that it was cutting out well-known, worthwhile venues (e.g. a city
// cultural center) — losing those false negatives mattered more than the
// occasional adult-programming result. amusement_arcade (pool halls,
// generic game rooms) was dropped instead as the actually low-value
// category. leisure=park is still excluded (hundreds per city, not really
// a "thing to do"); leisure=playground is included but capped separately
// (see PLAYGROUND_LIMIT) for the same reason.
const CATEGORIES: { tag: string; value: string; key: string }[] = [
  { tag: 'amenity', value: 'cinema', key: 'cinema' },
  { tag: 'amenity', value: 'theatre', key: 'theatre' },
  { tag: 'tourism', value: 'zoo', key: 'zoo' },
  { tag: 'tourism', value: 'aquarium', key: 'aquarium' },
  { tag: 'tourism', value: 'museum', key: 'museum' },
  { tag: 'tourism', value: 'theme_park', key: 'themePark' },
  { tag: 'leisure', value: 'water_park', key: 'waterPark' },
  { tag: 'leisure', value: 'bowling_alley', key: 'bowlingAlley' },
  { tag: 'leisure', value: 'playground', key: 'playground' },
]
const MAX_RESULTS = 30
// Playgrounds are dense enough (often several per neighborhood) that
// letting them compete on pure distance would crowd out the rarer,
// higher-value results (a zoo, a water park) from the rest of the list.
const PLAYGROUND_LIMIT = 5

function categoryKeyFor(tags: Record<string, string>): string | null {
  for (const { tag, value, key } of CATEGORIES) {
    if (tags[tag] === value) return key
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
          const categoryKey = categoryKeyFor(tags)
          const pos = overpassPosition(el)
          if (!categoryKey || !pos) return null
          const category = t(`nearbyActivities.categories.${categoryKey}`)
          // Most playgrounds carry no name in OSM (unlike a cinema/zoo,
          // which is a real business) — fall back to the category label
          // rather than dropping every unnamed one.
          const name = tags.name ?? (categoryKey === 'playground' ? category : null)
          if (!name) return null
          return {
            id: '',
            name,
            category,
            lat: pos.lat,
            lon: pos.lon,
            address: formatOverpassAddress(tags),
            phone: tags.phone ?? tags['contact:phone'],
            website: tags.website ?? tags['contact:website'],
            openingHours: tags.opening_hours,
            distanceKm: haversineKm(lat, lon, pos.lat, pos.lon),
          }
        })
        .filter((a): a is NearbyActivity => a !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)

      const playgroundLabel = t('nearbyActivities.categories.playground')
      const playgrounds = parsed.filter((a) => a.category === playgroundLabel).slice(0, PLAYGROUND_LIMIT)
      const rest = parsed
        .filter((a) => a.category !== playgroundLabel)
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
