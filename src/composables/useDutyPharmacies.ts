import { ref } from 'vue'
import { auth } from '@/firebase'

export interface DutyPharmacy {
  name: string
  dist: string
  address: string
  phone: string
  loc: string
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    })
  })
}

// Free, no-API-key reverse geocoding — good enough for a one-off "where am
// I" lookup. Turkey's admin levels don't map onto Nominatim's fields with
// full consistency (metropolitan districts sometimes land in `town`,
// sometimes `county`/`city_district`), hence the fallback chain.
async function resolveIlIlce(lat: number, lon: number): Promise<{ il: string; ilce: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=tr`,
  )
  if (!res.ok) throw new Error('geocode-failed')
  const data = await res.json()
  const address = data.address ?? {}
  const il = address.province ?? address.state
  const ilce = address.town ?? address.county ?? address.city_district ?? address.district ?? il
  if (!il || !ilce) throw new Error('geocode-incomplete')
  return { il, ilce }
}

export function useDutyPharmacies() {
  const loading = ref(false)
  const error = ref<'permission' | 'location' | 'geocode' | 'fetch' | null>(null)
  const pharmacies = ref<DutyPharmacy[]>([])
  const locationLabel = ref('')

  async function load() {
    loading.value = true
    error.value = null
    pharmacies.value = []
    locationLabel.value = ''

    let il: string, ilce: string
    try {
      const position = await getCurrentPosition()
      ;({ il, ilce } = await resolveIlIlce(position.coords.latitude, position.coords.longitude))
    } catch (err) {
      error.value =
        err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
          ? 'permission'
          : err instanceof Error && err.message.startsWith('geocode')
            ? 'geocode'
            : 'location'
      loading.value = false
      return
    }
    locationLabel.value = `${ilce} / ${il}`

    try {
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch(
        `/api/nobetci-eczane?il=${encodeURIComponent(il)}&ilce=${encodeURIComponent(ilce)}`,
        { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} },
      )
      if (!res.ok) throw new Error('fetch-failed')
      const data = await res.json()
      pharmacies.value = data.pharmacies ?? []
    } catch {
      error.value = 'fetch'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, pharmacies, locationLabel, load }
}
