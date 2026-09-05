import { useAuthStore } from '@/stores/auth'
import { notifyFamily } from '@/lib/notifyFamily'
import { currentWhoLabel } from '@/lib/describeActivity'
import { getCurrentPosition } from '@/lib/geolocation'
import { t } from '@/i18n'

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
    `${t('home.emergency.notificationBody', { who })}${locationLine}`,
    'emergency-alert',
    t('home.emergency.notificationTitle'),
  )
}
