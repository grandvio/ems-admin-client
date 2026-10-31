<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { pageDevices, pageGateways, pageStations } from '@/api/asset'
import { historyMetrics, latestMetrics } from '@/api/thing'
import { useUserStore } from '@/stores/user'
import { display, formatTs } from '@/utils/format'
import { listAll } from '@/utils/tree'

const MAX_SPAN = 31 * 24 * 60 * 60 * 1000
const user = useUserStore()
const stationId = ref(null)
const gatewayId = ref(null)
const deviceId = ref(null)
const gateways = ref([])
const devices = ref([])
const latest = ref([])
const loading = ref(false)
const historyLoading = ref(false)
const active = ref(null)
const truncated = ref(false)
const points = ref([])
const range = ref(defaultRange())
const chartRef = ref()
let chart

const stations = ref([])
const numeric = computed(() => points.value.some((item) => toNumber(item.value) !== null))

onMounted(async () => {
  stations.value = user.hasPerm('station:station:list') ? await listAll(pageStations) : user.stations
})

watch(stationId, async () => {
  gatewayId.value = null
  deviceId.value = null
  gateways.value = stationId.value ? await listAll(pageGateways, { stationId: stationId.value }) : []
  devices.value = []
  resetSeries()
})

watch(gatewayId, async () => {
  deviceId.value = null
  devices.value = gatewayId.value ? await listAll(pageDevices, { gatewayId: gatewayId.value }) : []
  resetSeries()
})

watch(deviceId, () => {
  resetSeries()
  if (deviceId.value) loadLatest()
})

onBeforeUnmount(() => {
  chart?.dispose()
  window.removeEventListener('resize', resize)
})

function defaultRange() {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return [start, end]
}

function resetSeries() {
  latest.value = []
  points.value = []
  active.value = null
  truncated.value = false
  chart?.clear()
}

async function loadLatest() {
  loading.value = true
  try {
    latest.value = await latestMetrics(deviceId.value)
  } finally {
    loading.value = false
  }
}

async function openHistory(row) {
  active.value = row
  await loadHistory()
}

async function loadHistory() {
  if (!deviceId.value || !active.value) return
  const [start, end] = range.value || []
  if (!start || !end) {
    ElMessage.warning('请选择时间范围')
    return
  }
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (endMs < startMs) {
    ElMessage.warning('结束时间不能早于开始时间')
    return
  }
  if (endMs - startMs > MAX_SPAN) {
    ElMessage.warning('查询跨度不能超过 31 天')
    return
  }
  historyLoading.value = true
  try {
    const data = await historyMetrics(deviceId.value, {
      identifier: active.value.identifier,
      start: startMs,
      end: endMs
    })
    points.value = data?.points || []
    truncated.value = Boolean(data?.truncated)
    await nextTick()
    renderChart(data)
  } finally {
    historyLoading.value = false
  }
}

function renderChart(data) {
  if (!chartRef.value || !numeric.value) {
    chart?.clear()
    return
  }
  if (!chart) {
    chart = echarts.init(chartRef.value)
    window.addEventListener('resize', resize)
  }
  chart.setOption({
    grid: { left: 48, right: 24, top: 32, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: data?.unit || '' },
    series: [{
      type: 'line',
      name: data?.name || active.value.identifier,
      showSymbol: false,
      smooth: true,
      color: '#0f766e',
      data: points.value
        .map((item) => [item.ts, toNumber(item.value)])
        .filter((item) => item[1] !== null)
    }]
  }, true)
}

function resize() {
  chart?.resize()
}

function toNumber(value) {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-select v-model="stationId" filterable placeholder="电站" style="width: 200px">
          <el-option v-for="item in stations" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="gatewayId" filterable placeholder="网关" style="width: 200px" :disabled="!stationId">
          <el-option v-for="item in gateways" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="deviceId" filterable placeholder="设备" style="width: 200px" :disabled="!gatewayId">
          <el-option v-for="item in devices" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-button :disabled="!deviceId" @click="loadLatest">刷新最新值</el-button>
      </div>
      <el-table v-loading="loading" :data="latest" border highlight-current-row @row-click="openHistory">
        <el-table-column prop="name" label="属性" min-width="140" />
        <el-table-column prop="identifier" label="标识" min-width="160" />
        <el-table-column label="最新值" min-width="120">
          <template #default="{ row }">{{ display(row.value) }} {{ row.unit || '' }}</template>
        </el-table-column>
        <el-table-column prop="quality" label="质量" width="80" />
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatTs(row.ts) }}</template>
        </el-table-column>
      </el-table>
      <p v-if="deviceId" class="hint">点击一行查看历史曲线。单次查询最长 31 天，超过 5000 个点会截断。</p>
    </section>

    <section v-if="active" class="panel">
      <div class="toolbar">
        <strong>{{ active.name }} · {{ active.identifier }}</strong>
        <el-date-picker v-model="range" type="datetimerange" range-separator="至" start-placeholder="开始" end-placeholder="结束" />
        <el-button type="primary" :loading="historyLoading" @click="loadHistory">查询</el-button>
      </div>
      <el-alert v-if="truncated" title="结果已截断，仅返回区间内最新的 5000 个点" type="warning" show-icon :closable="false" />
      <div v-show="numeric" ref="chartRef" class="chart" />
      <el-table v-if="!numeric" :data="points" border max-height="360">
        <el-table-column label="时间" min-width="180">
          <template #default="{ row }">{{ formatTs(row.ts) }}</template>
        </el-table-column>
        <el-table-column label="值" min-width="140">
          <template #default="{ row }">{{ display(row.value) }}</template>
        </el-table-column>
        <el-table-column prop="quality" label="质量" width="90" />
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.hint {
  margin: 10px 0 0;
  color: var(--ems-muted);
  font-size: 13px;
}

.chart {
  height: 360px;
  margin-top: 12px;
}
</style>
