import { t } from '@/i18n'

export function ageLabel(birthDate?: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months--
  if (months < 24) return t('age.monthsOld', { n: Math.max(months, 0) })
  return t('age.yearsOld', { n: Math.floor(months / 12) })
}
