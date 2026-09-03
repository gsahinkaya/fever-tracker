<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNearbyHospitals } from '@/composables/useNearbyHospitals'

const { t } = useI18n()
const { loading, error, hospitals, load } = useNearbyHospitals()

onMounted(load)

function mapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

function telUrl(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('nearbyHospitals.title') }}</span>
    </div>

    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="hospital" class="mb-4" />
      <div class="text-body-2 text-medium-emphasis">{{ t('nearbyHospitals.loading') }}</div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <v-icon icon="mdi-map-marker-off-outline" size="48" color="medium-emphasis" class="mb-4" />
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ t(`nearbyHospitals.errors.${error}`) }}
      </p>
      <v-btn color="hospital" variant="tonal" prepend-icon="mdi-refresh" @click="load">{{
        t('nearbyHospitals.retry')
      }}</v-btn>
    </div>

    <template v-else>
      <p class="text-caption text-medium-emphasis mb-4">{{ t('nearbyHospitals.sourceHint') }}</p>

      <div v-if="!hospitals.length" class="text-center text-medium-emphasis py-8">
        {{ t('nearbyHospitals.empty') }}
      </div>

      <v-list v-else lines="three" class="mb-2">
        <v-list-item v-for="place in hospitals" :key="place.id">
          <template #prepend>
            <v-avatar color="hospital" variant="tonal">
              <v-icon icon="mdi-hospital-building" />
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold">{{ place.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ place.distanceKm.toFixed(1) }} km
            <template v-if="place.emergency"> · {{ t('nearbyHospitals.emergency') }}</template>
            <template v-if="place.address"> · {{ place.address }}</template>
          </v-list-item-subtitle>
          <template #append>
            <div class="d-flex flex-column ga-1">
              <v-btn
                v-if="place.phone"
                icon="mdi-phone"
                size="small"
                variant="text"
                color="hospital"
                :href="telUrl(place.phone)"
                :aria-label="t('nearbyHospitals.callAria')"
              />
              <v-btn
                icon="mdi-map-marker-outline"
                size="small"
                variant="text"
                color="hospital"
                :href="mapsUrl(place.lat, place.lon)"
                target="_blank"
                rel="noopener"
                :aria-label="t('nearbyHospitals.mapAria')"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <v-btn block variant="tonal" color="hospital" prepend-icon="mdi-refresh" @click="load">{{
        t('nearbyHospitals.retry')
      }}</v-btn>
    </template>
  </v-container>
</template>
