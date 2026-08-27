import { t } from '@/i18n'
import type { FeedingEntry } from '@/types/health'

// Shared by CombinedTimelineList (fever+dose+feeding) and FeedingTimelineList
// (feeding-only), which otherwise duplicated this exact feeding-entry title
// logic and its milk-type/side label maps.
export function feedingEntryTitle(entry: FeedingEntry): string {
  if (entry.type === 'breastfeeding') {
    const parts = [t('timeline.breastfeedingTitle')]
    if (entry.durationMinutes) parts.push(`${entry.durationMinutes} dk`)
    if (entry.side) parts.push(t(`timeline.sides.${entry.side}`))
    return parts.join(' · ')
  }
  if (entry.type === 'bottle') {
    return `${entry.amountMl} ml · ${t(`timeline.milkTypes.${entry.milkType}`)}`
  }
  return entry.note
    ? t('timeline.solidFoodWithNote', { note: entry.note })
    : t('timeline.solidFoodTitle')
}
