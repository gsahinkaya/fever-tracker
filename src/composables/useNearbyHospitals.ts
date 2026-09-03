import { ref } from 'vue'
import { getCurrentPosition, haversineKm } from '@/lib/geolocation'
import { type OverpassElement, formatOverpassAddress, overpassPosition } from '@/lib/overpass'
import { auth } from '@/firebase'

export interface NearbyHospital {
  id: string
  name: string
  lat: number
  lon: number
  address: string
  phone?: string
  emergency: boolean
  distanceKm: number
}

const MAX_RESULTS = 30

export function useNearbyHospitals() {
  const loading = ref(false)
  const error = ref<'permission' | 'location' | 'fetch' | null>(null)
  const hospitals = ref<NearbyHospital[]>([])

  async function load() {
    loading.value = true
    error.value = null
    hospitals.value = []

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
      const res = await fetch(`/api/nearby-hospitals?lat=${lat}&lon=${lon}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      })
      if (!res.ok) throw new Error('fetch-failed')
      const data = (await res.json()) as { elements: OverpassElement[] }

      hospitals.value = data.elements
        .map((el): NearbyHospital | null => {
          const tags = el.tags ?? {}
          const pos = overpassPosition(el)
          if (!tags.name || !pos) return null
          return {
            id: '',
            name: tags.name,
            lat: pos.lat,
            lon: pos.lon,
            address: formatOverpassAddress(tags),
            phone: tags.phone ?? tags['contact:phone'],
            emergency: tags.emergency === 'yes',
            distanceKm: haversineKm(lat, lon, pos.lat, pos.lon),
          }
        })
        .filter((h): h is NearbyHospital => h !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, MAX_RESULTS)
        .map((h, i) => ({ ...h, id: String(i) }))
    } catch {
      error.value = 'fetch'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, hospitals, load }
}
