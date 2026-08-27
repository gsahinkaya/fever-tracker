<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LmsRow } from '@/data/whoGrowthStandards'
import { REFERENCE_CURVES, percentileForMeasurement, referenceCurvePoints } from '@/lib/growthPercentile'

// Same visual language as MeasurementChart, but the x-axis is age-in-months
// (not calendar time) so the child's own trend can be overlaid on WHO's
// fixed reference percentile curves — those are only meaningful plotted
// against age, not against when a reading happened to be taken.
const props = defineProps<{
  points: { id: string; ageMonths: number; value: number }[]
  table: LmsRow[]
  unit: string
  label: string
  emptyText: string
  decimals?: number
}>()

const decimals = props.decimals ?? 1
const sorted = computed(() => [...props.points].sort((a, b) => a.ageMonths - b.ageMonths))

const width = 320
const height = 200
const padding = { top: 20, right: 16, bottom: 20, left: 34 }

const maxAgeMonths = computed(() => {
  const dataMax = sorted.value.length ? Math.max(...sorted.value.map((p) => p.ageMonths)) : 0
  // Show a little runway past the last reading, capped at the table's range.
  return Math.min(60, Math.max(6, Math.ceil(dataMax / 3) * 3 + 3))
})

const curves = computed(() =>
  REFERENCE_CURVES.map((c) => ({
    ...c,
    points: referenceCurvePoints(props.table, c.z, maxAgeMonths.value),
  })),
)

const valueMin = computed(() => {
  const curveMin = Math.min(...curves.value.flatMap((c) => c.points.map((p) => p.value)))
  const dataMin = sorted.value.length ? Math.min(...sorted.value.map((p) => p.value)) : curveMin
  return Math.min(curveMin, dataMin) * 0.97
})
const valueMax = computed(() => {
  const curveMax = Math.max(...curves.value.flatMap((c) => c.points.map((p) => p.value)))
  const dataMax = sorted.value.length ? Math.max(...sorted.value.map((p) => p.value)) : curveMax
  return Math.max(curveMax, dataMax) * 1.03
})

function xFor(ageMonths: number) {
  return padding.left + (ageMonths / maxAgeMonths.value) * (width - padding.left - padding.right)
}
function yFor(value: number) {
  const span = valueMax.value - valueMin.value || 1
  return (
    height -
    padding.bottom -
    ((value - valueMin.value) / span) * (height - padding.top - padding.bottom)
  )
}

function curvePath(points: { ageMonths: number; value: number }[]) {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.ageMonths).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
    .join(' ')
}

const dataLinePath = computed(() =>
  sorted.value
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.ageMonths).toFixed(1)} ${yFor(p.value).toFixed(1)}`,
    )
    .join(' '),
)

const lastPoint = computed(() => sorted.value[sorted.value.length - 1] ?? null)
const lastPointPercentile = computed(() =>
  lastPoint.value ? percentileForMeasurement(props.table, lastPoint.value.ageMonths, lastPoint.value.value) : null,
)

const hoverIndex = ref<number | null>(null)
function onMove(evt: PointerEvent) {
  const svgEl = evt.currentTarget as SVGSVGElement
  const rect = svgEl.getBoundingClientRect()
  const scaleX = width / rect.width
  const x = (evt.clientX - rect.left) * scaleX
  let closest = 0
  let closestDist = Infinity
  sorted.value.forEach((p, i) => {
    const dist = Math.abs(xFor(p.ageMonths) - x)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  hoverIndex.value = closest
}
const hovered = computed(() => (hoverIndex.value != null ? sorted.value[hoverIndex.value] : null))
const hoveredPercentile = computed(() =>
  hovered.value ? percentileForMeasurement(props.table, hovered.value.ageMonths, hovered.value.value) : null,
)

function ageLabel(ageMonths: number) {
  return `${Math.round(ageMonths)} ay`
}
</script>

<template>
  <div class="viz-root">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="label"
      @pointermove="sorted.length ? onMove($event) : null"
      @pointerleave="hoverIndex = null"
    >
      <line
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="height - padding.bottom"
        :y2="height - padding.bottom"
        class="axis-line"
      />

      <template v-for="curve in curves" :key="curve.label">
        <path
          :d="curvePath(curve.points)"
          fill="none"
          :class="curve.z === 0 ? 'ref-line-median' : 'ref-line'"
        />
        <text
          :x="width - padding.right + 2"
          :y="yFor(curve.points[curve.points.length - 1]!.value) + 3"
          class="ref-label"
        >
          {{ curve.label }}
        </text>
      </template>

      <path :d="dataLinePath" class="data-line" fill="none" />
      <circle
        v-for="(p, i) in sorted"
        :key="p.id"
        :cx="xFor(p.ageMonths)"
        :cy="yFor(p.value)"
        :r="hoverIndex === i ? 5 : 4"
        class="data-marker"
      />

      <line
        v-if="hovered"
        :x1="xFor(hovered.ageMonths)"
        :x2="xFor(hovered.ageMonths)"
        :y1="padding.top"
        :y2="height - padding.bottom"
        class="crosshair"
      />
    </svg>

    <div v-if="!sorted.length" class="empty-state">{{ emptyText }}</div>

    <div v-if="hovered" class="tooltip">
      <strong>{{ hovered.value.toFixed(decimals) }} {{ unit }}</strong>
      <span>{{ ageLabel(hovered.ageMonths) }} · {{ hoveredPercentile }}. persentil</span>
    </div>
    <div v-else-if="lastPoint" class="tooltip">
      <strong>{{ lastPoint.value.toFixed(decimals) }} {{ unit }}</strong>
      <span>{{ ageLabel(lastPoint.ageMonths) }} · {{ lastPointPercentile }}. persentil</span>
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

.ref-line {
  stroke: var(--gridline);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
.ref-line-median {
  stroke: var(--text-muted);
  stroke-width: 1.25;
  stroke-dasharray: 3 3;
}
.ref-label {
  font-size: 8px;
  fill: var(--text-muted);
  dominant-baseline: middle;
}

.data-line {
  stroke: var(--series-1);
  stroke-width: 2.5;
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
