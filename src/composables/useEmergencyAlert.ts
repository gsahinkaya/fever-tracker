import { useAuthStore } from '@/stores/auth'
import { useFeverLogStore } from '@/stores/feverLog'
import { notifyFamily } from '@/lib/notifyFamily'
import { currentWhoLabel } from '@/lib/describeActivity'
import { getCurrentPosition } from '@/lib/geolocation'
import { shortDateTime } from '@/lib/dateFormat'
import type { FeverReading, DoseEntry } from '@/types/health'
import { t } from '@/i18n'

// How far back to look for context to attach to the alert — recent enough
// to matter for an emergency (e.g. "39.4°C 20 minutes ago, Calpol given
// before that"), not the whole history.
const HISTORY_WINDOW_HOURS = 24

// Fires both halves of the emergency button at once, deliberately not
// sequenced — dialing 112 must never wait on geolocation or a network
// call, so the tel: navigation and the family push are kicked off
// together and the push is best-effort (same as every other notifyFamily
// call: a failure here must never block or surface an error for the part
// that actually matters, the call itself).
export function triggerEmergencyAlert() {
  window.location.href = 'tel:112'
  void sendEmergencyAlert()
}

// Whoever the family member rushes to meet (a responder, a doctor at the
// ER) doesn't have to ask the panicking parent what's already been done —
// it's right there in the alert they got on their phone.
function historyLine(): string {
  const feverLogStore = useFeverLogStore()
  const recent = feverLogStore.recentEntries(HISTORY_WINDOW_HOURS)
  const lastReading = recent.find((e): e is FeverReading => e.type === 'reading')
  const lastDose = recent.find((e): e is DoseEntry => e.type === 'dose')

  const parts: string[] = []
  if (lastReading) {
    parts.push(
      t('home.emergency.historyFever', {
        temp: lastReading.temperature.toFixed(1),
        time: shortDateTime(lastReading.takenAt),
      }),
    )
  }
  if (lastDose) {
    parts.push(
      t('home.emergency.historyDose', {
        med: lastDose.medicationName,
        time: shortDateTime(lastDose.takenAt),
      }),
    )
  }
  return parts.length ? ` ${parts.join(' · ')}` : ''
}

async function sendEmergencyAlert() {
  const authStore = useAuthStore()
  const who = authStore.profile?.name || currentWhoLabel()

  let locationLine = ''
  try {
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords
    locationLine = ` ${t('home.emergency.locationLabel')}: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  } catch {
    // Best-effort — the alert still goes out without a location if
    // permission is denied or a fix can't be gotten in time.
  }

  await notifyFamily(
    `${t('home.emergency.notificationBody', { who })}${historyLine()}${locationLine}`,
    'emergency-alert',
    t('home.emergency.notificationTitle'),
  )
}
