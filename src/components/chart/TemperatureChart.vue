<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FeverReading } from '@/types/health'

const props = defineProps<{ readings: FeverReading[] }>()

const sorted = computed(() => [...props.readings].sort((a, b) => a.takenAt - b.takenAt))

const width = 320
const height = 180
const padding = { top: 16, right: 16, bottom: 12, left: 34 }

const tempMin = computed(() => Math.min(36, ...sorted.value.map((r) => r.temperature)) - 0.5)
const tempMax = computed(() => Math.max(39.5, ...sorted.value.map((r) => r.temperature)) + 0.5)
const timeMin = computed(() => Math.min(...sorted.value.map((r) => r.takenAt)))
const timeMax = computed(() => Math.max(...sorted.value.map((r) => r.takenAt)))

function xFor(ts: number) {
  const span = timeMax.value - timeMin.value || 1
  return padding.left + ((ts - timeMin.value) / span) * (width - padding.left - padding.right)
}
function yFor(temp: number) {
  const span = tempMax.value - tempMin.value || 1
  return height - padding.bottom - ((temp - tempMin.value) / span) * (height - padding.top - padding.bottom)
}

const linePath = computed(() =>
  sorted.value
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(r.takenAt).toFixed(1)} ${yFor(r.temperature).toFixed(1)}`)
    .join(' '),
)

const hoverIndex = ref<number | null>(null)

function onMove(evt: PointerEvent) {
  const svgEl = evt.currentTarget as SVGSVGElement
  const rect = svgEl.getBoundingClientRect()
  const scaleX = width / rect.width
  const x = (evt.clientX - rect.left) * scaleX
  let closest = 0
  let closestDist = Infinity
  sorted.value.forEach((r, i) => {
    const dist = Math.abs(xFor(r.takenAt) - x)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  hoverIndex.value = closest
}

const hovered = computed(() => (hoverIndex.value != null ? sorted.value[hoverIndex.value] : null))

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="viz-root">
    <svg
      v-if="sorted.length"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Son 48 saat ateş grafiği"
      @pointermove="onMove"
      @pointerleave="hoverIndex = null"
    >
      <line :x1="padding.left" :x2="width - padding.right" :y1="yFor(38)" :y2="yFor(38)" class="ref-line ref-serious" />
      <text :x="width - padding.right" :y="yFor(38) - 4" class="ref-label ref-serious" text-anchor="end">38°C</text>

      <line :x1="padding.left" :x2="width - padding.right" :y1="yFor(39)" :y2="yFor(39)" class="ref-line ref-critical" />
      <text :x="width - padding.right" :y="yFor(39) - 4" class="ref-label ref-critical" text-anchor="end">39°C</text>

      <line
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="height - padding.bottom"
        :y2="height - padding.bottom"
        class="axis-line"
      />

      <path :d="linePath" class="data-line" fill="none" />

      <circle
        v-for="(r, i) in sorted"
        :key="r.id"
        :cx="xFor(r.takenAt)"
        :cy="yFor(r.temperature)"
        :r="hoverIndex === i ? 5 : 4"
        class="data-marker"
      />

      <line
        v-if="hovered"
        :x1="xFor(hovered.takenAt)"
        :x2="xFor(hovered.takenAt)"
        :y1="padding.top"
        :y2="height - padding.bottom"
        class="crosshair"
      />
    </svg>

    <div v-else class="empty-state">Son 48 saatte ölçüm kaydı yok.</div>

    <div v-if="hovered" class="tooltip">
      <strong>{{ hovered.temperature.toFixed(1) }} °C</strong>
      <span>{{ timeLabel(hovered.takenAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.viz-root {
  color-scheme: light;
  --surface-1: #fcfcfb;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --gridline: #e1e0d9;
  --axis: #c3c2b7;
  --series-1: #256abf;
  --status-serious: #ec835a;
  --status-critical: #d03b3b;
  position: relative;
  background: var(--surface-1);
  border-radius: 8px;
  padding: 8px;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme='light'])) .viz-root {
    color-scheme: dark;
    --surface-1: #1a1a19;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --gridline: #2c2c2a;
    --axis: #383835;
    --series-1: #3987e5;
    --status-serious: #ec835a;
    --status-critical: #e66767;
  }
}
:root[data-theme='dark'] .viz-root {
  color-scheme: dark;
  --surface-1: #1a1a19;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --text-muted: #898781;
  --gridline: #2c2c2a;
  --axis: #383835;
  --series-1: #3987e5;
  --status-serious: #ec835a;
  --status-critical: #e66767;
}

svg {
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
}

.axis-line {
  stroke: var(--axis);
  stroke-width: 1;
}
.ref-line {
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
.ref-serious {
  stroke: var(--status-serious);
}
.ref-critical {
  stroke: var(--status-critical);
}
.ref-label {
  font-size: 8px;
}
.ref-label.ref-serious {
  fill: var(--status-serious);
}
.ref-label.ref-critical {
  fill: var(--status-critical);
}

.data-line {
  stroke: var(--series-1);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.data-marker {
  fill: var(--surface-1);
  stroke: var(--series-1);
  stroke-width: 2;
}
.crosshair {
  stroke: var(--text-muted);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}

.empty-state {
  padding: 32px 8px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.tooltip {
  position: absolute;
  top: 8px;
  left: 8px;
  background: var(--surface-1);
  border: 1px solid var(--gridline);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  pointer-events: none;
}
.tooltip span {
  color: var(--text-secondary);
}
</style>
