<script setup lang="ts">
import { computed, ref } from 'vue'

// Generic single-series trend chart — same mark spec as TemperatureChart
// (filled markers, area wash, edge-aware end-label, hover crosshair) but
// without the fixed 38/39°C threshold lines, since height/weight have no
// universal alert thresholds the way a fever does.
const props = defineProps<{
  points: { id: string; takenAt: number; value: number }[]
  unit: string
  label: string
  emptyText: string
  decimals?: number
}>()

const decimals = props.decimals ?? 1
const sorted = computed(() => [...props.points].sort((a, b) => a.takenAt - b.takenAt))

const width = 320
const height = 180
const padding = { top: 20, right: 16, bottom: 12, left: 34 }

const valueMin = computed(() => {
  const min = Math.min(...sorted.value.map((p) => p.value))
  const span = valueSpanRaw.value
  return min - Math.max(span * 0.15, 0.5)
})
const valueMax = computed(() => {
  const max = Math.max(...sorted.value.map((p) => p.value))
  const span = valueSpanRaw.value
  return max + Math.max(span * 0.15, 0.5)
})
const valueSpanRaw = computed(() => {
  if (!sorted.value.length) return 1
  return (
    Math.max(...sorted.value.map((p) => p.value)) - Math.min(...sorted.value.map((p) => p.value))
  )
})
const timeMin = computed(() => Math.min(...sorted.value.map((p) => p.takenAt)))
const timeMax = computed(() => Math.max(...sorted.value.map((p) => p.takenAt)))

function xFor(ts: number) {
  const span = timeMax.value - timeMin.value || 1
  return padding.left + ((ts - timeMin.value) / span) * (width - padding.left - padding.right)
}
function yFor(value: number) {
  const span = valueMax.value - valueMin.value || 1
  return (
    height -
    padding.bottom -
    ((value - valueMin.value) / span) * (height - padding.top - padding.bottom)
  )
}

const linePath = computed(() =>
  sorted.value
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.takenAt).toFixed(1)} ${yFor(p.value).toFixed(1)}`,
    )
    .join(' '),
)

const areaPath = computed(() => {
  if (!sorted.value.length) return ''
  const base = height - padding.bottom
  const first = sorted.value[0]!
  const last = sorted.value[sorted.value.length - 1]!
  return `${linePath.value} L ${xFor(last.takenAt).toFixed(1)} ${base} L ${xFor(first.takenAt).toFixed(1)} ${base} Z`
})

const lastPoint = computed(() => sorted.value[sorted.value.length - 1] ?? null)

const endLabelX = computed(() => {
  if (!lastPoint.value) return 0
  const x = xFor(lastPoint.value.takenAt)
  return x - padding.left < 28 ? x + 8 : x - 8
})
const endLabelAnchor = computed(() => {
  if (!lastPoint.value) return 'end'
  return xFor(lastPoint.value.takenAt) - padding.left < 28 ? 'start' : 'end'
})
const endLabelY = computed(() => {
  if (!lastPoint.value) return 0
  const y = yFor(lastPoint.value.value)
  return y - padding.top < 16 ? y + 18 : y - 10
})

const hoverIndex = ref<number | null>(null)

function onMove(evt: PointerEvent) {
  const svgEl = evt.currentTarget as SVGSVGElement
  const rect = svgEl.getBoundingClientRect()
  const scaleX = width / rect.width
  const x = (evt.clientX - rect.left) * scaleX
  let closest = 0
  let closestDist = Infinity
  sorted.value.forEach((p, i) => {
    const dist = Math.abs(xFor(p.takenAt) - x)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  hoverIndex.value = closest
}

const hovered = computed(() => (hoverIndex.value != null ? sorted.value[hoverIndex.value] : null))

function timeLabel(ts: number) {
  return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <div class="viz-root">
    <svg
      v-if="sorted.length"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="label"
      @pointermove="onMove"
      @pointerleave="hoverIndex = null"
    >
      <defs>
        <linearGradient id="measurement-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--series-1)" stop-opacity="0.16" />
          <stop offset="100%" stop-color="var(--series-1)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <line
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="height - padding.bottom"
        :y2="height - padding.bottom"
        class="axis-line"
      />

      <path :d="areaPath" fill="url(#measurement-area-fill)" />
      <path :d="linePath" class="data-line" fill="none" />

      <circle
        v-for="(p, i) in sorted"
        :key="p.id"
        :cx="xFor(p.takenAt)"
        :cy="yFor(p.value)"
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

      <template v-if="lastPoint && hoverIndex === null">
        <text :x="endLabelX" :y="endLabelY" :text-anchor="endLabelAnchor" class="end-label halo">
          {{ lastPoint.value.toFixed(decimals) }}{{ unit }}
        </text>
        <text :x="endLabelX" :y="endLabelY" :text-anchor="endLabelAnchor" class="end-label">
          {{ lastPoint.value.toFixed(decimals) }}{{ unit }}
        </text>
      </template>
    </svg>

    <div v-else class="empty-state">{{ emptyText }}</div>

    <div v-if="hovered" class="tooltip">
      <strong>{{ hovered.value.toFixed(decimals) }} {{ unit }}</strong>
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
  position: relative;
  background: var(--surface-1);
  border-radius: 8px;
  padding: 8px;
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

.data-line {
  stroke: var(--series-1);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.data-marker {
  fill: var(--series-1);
  stroke: var(--surface-1);
  stroke-width: 2;
}
.crosshair {
  stroke: var(--text-muted);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}

.end-label {
  font-size: 11px;
  font-weight: 700;
  fill: var(--text-primary);
}
.end-label.halo {
  stroke: var(--surface-1);
  stroke-width: 3;
  stroke-linejoin: round;
  fill: var(--surface-1);
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
