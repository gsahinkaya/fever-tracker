export type MilestoneCategory = 'motor' | 'language' | 'social' | 'cognitive'

export interface MilestoneItem {
  id: string
  // Typical age of achievement, in whole months from birth — coarser than
  // vaccinationSchedule.ts's ageDays since milestones are a range, not a
  // fixed date, and most published checklists (CDC's "Learn the Signs. Act
  // Early." being the most widely cited) group by month checkpoint anyway.
  ageMonths: number
  category: MilestoneCategory
  label: string
}

// A general developmental guide, not a diagnostic tool — every child
// develops at their own pace, and this is meant to prompt a conversation
// with a pediatrician, not replace one. Turkish-only by design, same as
// VACCINATION_SCHEDULE right above this file in spirit: this is reference
// content (like a data catalog), not UI chrome, so it isn't run through
// vue-i18n the way component labels are.
export const DEVELOPMENTAL_MILESTONES: MilestoneItem[] = [
  { id: 'm2-motor-1', ageMonths: 2, category: 'motor', label: 'Karnı üstüne yatınca başını kısa süreliğine kaldırabilir' },
  { id: 'm2-social-1', ageMonths: 2, category: 'social', label: 'Yüzlere bakıp gülümser' },
  { id: 'm2-language-1', ageMonths: 2, category: 'language', label: 'Ani seslere tepki verir, irkilir' },

  { id: 'm4-motor-1', ageMonths: 4, category: 'motor', label: 'Desteklendiğinde başını dik tutar' },
  { id: 'm4-motor-2', ageMonths: 4, category: 'motor', label: 'Elindeki bir oyuncağı ağzına götürür' },
  { id: 'm4-social-1', ageMonths: 4, category: 'social', label: 'Kahkaha atar' },
  { id: 'm4-cognitive-1', ageMonths: 4, category: 'cognitive', label: 'Tanıdık yüzleri yabancılardan ayırt eder' },

  { id: 'm6-motor-1', ageMonths: 6, category: 'motor', label: 'Desteksiz oturabilir' },
  { id: 'm6-motor-2', ageMonths: 6, category: 'motor', label: 'Bir nesneyi bir elinden diğerine geçirir' },
  { id: 'm6-language-1', ageMonths: 6, category: 'language', label: 'Hece benzeri sesler çıkarır ("ba-ba" gibi)' },
  { id: 'm6-social-1', ageMonths: 6, category: 'social', label: 'Yabancılara karşı çekingenlik gösterebilir' },

  { id: 'm9-motor-1', ageMonths: 9, category: 'motor', label: 'Mobilyaya tutunarak ayağa kalkar' },
  { id: 'm9-motor-2', ageMonths: 9, category: 'motor', label: 'Küçük nesneleri baş ve işaret parmağıyla tutar' },
  { id: 'm9-language-1', ageMonths: 9, category: 'language', label: '"anne", "baba" gibi seslere benzer heceler tekrarlar' },
  { id: 'm9-social-1', ageMonths: 9, category: 'social', label: 'Cee-ee gibi basit oyunlara katılır' },

  { id: 'm12-motor-1', ageMonths: 12, category: 'motor', label: 'Tutunarak ya da desteksiz birkaç adım atar' },
  { id: 'm12-language-1', ageMonths: 12, category: 'language', label: 'Anlamlı 1-2 kelime söyler' },
  { id: 'm12-social-1', ageMonths: 12, category: 'social', label: 'Basit yönergeleri anlar, el sallayarak vedalaşır' },
  { id: 'm12-cognitive-1', ageMonths: 12, category: 'cognitive', label: 'İstediği bir nesneyi parmağıyla işaret eder' },

  { id: 'm18-motor-1', ageMonths: 18, category: 'motor', label: 'Yardımsız yürür, koşmaya çalışır' },
  { id: 'm18-language-1', ageMonths: 18, category: 'language', label: 'En az 6-10 kelime kullanır' },
  { id: 'm18-social-1', ageMonths: 18, category: 'social', label: 'Ebeveynini ya da başkalarını taklit eder' },
  { id: 'm18-cognitive-1', ageMonths: 18, category: 'cognitive', label: 'Resimli kitaplara ilgi gösterir' },

  { id: 'm24-motor-1', ageMonths: 24, category: 'motor', label: 'Elinden tutulduğunda merdiven çıkar' },
  { id: 'm24-language-1', ageMonths: 24, category: 'language', label: 'İki kelimelik cümleler kurar ("su iste" gibi)' },
  { id: 'm24-social-1', ageMonths: 24, category: 'social', label: 'Diğer çocukların yanında oynar (paralel oyun)' },
  { id: 'm24-cognitive-1', ageMonths: 24, category: 'cognitive', label: 'Vücut bölümlerinden en az birkaçını gösterebilir' },

  { id: 'm36-motor-1', ageMonths: 36, category: 'motor', label: 'Üç tekerlekli bisiklete biner, merdivenleri tek tek ayakla çıkar' },
  { id: 'm36-language-1', ageMonths: 36, category: 'language', label: '3 veya daha fazla kelimelik cümleler kurar, çoğunlukla anlaşılır konuşur' },
  { id: 'm36-social-1', ageMonths: 36, category: 'social', label: 'Diğer çocuklarla sırayla oynamaya başlar' },
  { id: 'm36-cognitive-1', ageMonths: 36, category: 'cognitive', label: 'Basit yapbozları tamamlayabilir' },
]
