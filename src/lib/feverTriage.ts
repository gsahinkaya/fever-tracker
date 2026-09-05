import { t } from '@/i18n'

export type FeverTriageLevel = 'emergency' | 'doctor' | 'monitor'

export interface FeverTriageResult {
  level: FeverTriageLevel
  message: string
}

// Deliberately conservative and temperature+age only — not a diagnosis.
// Thresholds follow the widely used pediatric rule that any fever in a
// young infant needs urgent evaluation (AAP/NHS), plus general same-day
// consult thresholds for older infants and very high fevers at any age.
// Red-flag symptoms (breathing difficulty, stiff neck, non-blanching rash,
// seizure, unresponsiveness) override this regardless of temperature —
// there's no symptom input here, so every tier's message repeats that
// caveat instead of trying to model those symptoms.
export function assessFeverTriage(temperature: number, ageMonths: number | null): FeverTriageResult {
  if ((ageMonths != null && ageMonths < 3 && temperature >= 38) || temperature >= 40) {
    return { level: 'emergency', message: t('feverTriage.emergency') }
  }
  if ((ageMonths != null && ageMonths < 6 && temperature >= 39) || temperature >= 39.5) {
    return { level: 'doctor', message: t('feverTriage.doctor') }
  }
  return { level: 'monitor', message: t('feverTriage.monitor') }
}
