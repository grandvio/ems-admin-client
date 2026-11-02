<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getStation, pageDevices, pageGateways, pageStations } from '@/api/asset'
import { historyMetrics, latestMetrics } from '@/api/thing'
import { useUserStore } from '@/stores/user'
import { labelOf, stationStatus, stationType } from '@/utils/dict'
import { formatDate } from '@/utils/format'
import { listAll } from '@/utils/tree'

const MAX_SPAN = 31 * 24 * 60 * 60 * 1000
const user = useUserStore()
const loading = ref(false)
const stations = ref([])
const stationId = ref(null)
const station = ref(null)
const gateways = ref([])
const devices = ref([])
const bundles = ref([])
const todayEnergy = ref(null)
const range = ref(todayRange())
const chartMode = ref('power')
const historyLoading = ref(false)
const truncated = ref(false)
const chartRef = ref()
let chart
let timer

const canAsset = computed(() => user.hasPerm('station:device:list') && user.hasPerm('station:gateway:list'))
const canMetric = computed(() => user.hasPerm('data:metric:query'))
const pcsBundles = computed(() => bundles.value.filter((item) => kindOf(item.device) === 'pcs'))
const bmsBundles = computed(() => bundles.value.filter((item) => kindOf(item.device) === 'bms'))
const powerItem = computed(() => firstMetric(pcsBundles.value, ['activepower']))
const socItem = computed(() => firstMetric(bmsBundles.value, ['soc']))
const sideMetrics = computed(() => [
  { label: '电池 SOC', item: socItem.value, icon: 'Odometer', tone: 'blue' },
  { label: '有功功率', item: powerItem.value, icon: 'Lightning', tone: 'orange' },
  { label: '无功功率', item: firstMetric(pcsBundles.value, ['reactivepower']), icon: 'Opportunity', tone: 'cyan' },
  { label: '整包电压', item: firstMetric(bmsBundles.value, ['packvoltage']), icon: 'Histogram', tone: 'green' },
  { label: '整包电流', item: firstMetric(bmsBundles.value, ['packcurrent']), icon: 'Sort', tone: 'green' },
  { label: '最高单体温度', item: firstMetric(bmsBundles.value, ['maxcelltemperature']), icon: 'Sunrise', tone: 'red' }
])
const runningDayText = computed(() => {
  const days = runningDays(station.value?.gridConnectedDate)
  return days === null ? '—' : `${days} 天`
})
const statusGroups = computed(() => {
  const pcs = devices.value.filter((item) => kindOf(item) === 'pcs')
  const bms = devices.value.filter((item) => kindOf(item) === 'bms')
  const other = devices.value.filter((item) => kindOf(item) === 'other')
  const groups = [
    { key: 'gateway', label: '通讯盒', text: onlineText(gateways.value, 'onlineStatus') },
    { key: 'pcs', label: 'PCS', text: onlineText(pcs) },
    { key: 'bms', label: 'BMS', text: onlineText(bms) }
  ]
  if (other.length) groups.push({ key: 'other', label: '其他', text: onlineText(other) })
  return groups
})
const topo = computed(() => {
  const nodes = {
    grid: { key: 'grid', title: '电网', hint: '并网点', value: showMetric(powerItem.value), icon: 'OfficeBuilding', tone: 'grid' },
    load: { key: 'load', title: '负载', hint: '用电侧', value: '—', icon: 'House', tone: 'load' },
    battery: { key: 'battery', title: '电池', hint: 'SOC', value: showMetric(socItem.value), icon: 'Box', tone: 'bms' },
    pv: { key: 'pv', title: '光伏', hint: '发电侧', value: '—', icon: 'Sunny', tone: 'pv' },
    charger: { key: 'charger', title: '充电桩', hint: '充电侧', value: '—', icon: 'Van', tone: 'charge' }
  }
  const layouts = {
    STORAGE: { top: [nodes.grid], bottom: [nodes.load, nodes.battery] },
    PV_STORAGE: { top: [nodes.pv, nodes.grid], bottom: [nodes.load, nodes.battery] },
    PV_STORAGE_CHARGE: { top: [nodes.pv, nodes.grid, nodes.charger], bottom: [nodes.load, nodes.battery] }
  }
  const placed = layouts[station.value?.stationType] || layouts.STORAGE
  return {
    top: placed.top,
    bottom: placed.bottom,
    pcsValue: firstMetric(pcsBundles.value, ['runningstate'])?.value || '—'
  }
})

onMounted(async () => {
  stations.value = user.hasPerm('station:station:list') ? await listAll(pageStations) : [...user.stations]
  stationId.value = stations.value[0]?.id ?? null
  timer = setInterval(refreshLive, 30000)
})

watch(stationId, () => loadStation())

onBeforeUnmount(() => {
  clearInterval(timer)
  chart?.dispose()
  window.removeEventListener('resize', resizeChart)
})

async function loadStation() {
  if (!stationId.value) return
  loading.value = true
  try {
    station.value = user.hasPerm('station:station:list')
      ? await getStation(stationId.value)
      : stations.value.find((item) => item.id === stationId.value)
    if (!canAsset.value) {
      gateways.value = []
      devices.value = []
      bundles.value = []
      return
    }
    const [gatewayRows, deviceRows] = await Promise.all([
      listAll(pageGateways, { stationId: stationId.value }),
      listAll(pageDevices, { stationId: stationId.value })
    ])
    gateways.value = gatewayRows
    devices.value = deviceRows
    await refreshLive()
    range.value = todayRange()
    await loadHistory()
  } finally {
    loading.value = false
  }
}

async function refreshLive() {
  if (!canMetric.value) {
    bundles.value = devices.value.map((device) => ({ device, latest: [] }))
    todayEnergy.value = null
    return
  }
  const next = []
  for (const device of devices.value) {
    if (!device.productId) {
      next.push({ device, latest: [] })
      continue
    }
    try {
      next.push({ device, latest: await latestMetrics(device.id) })
    } catch {
      next.push({ device, latest: [] })
    }
  }
  bundles.value = next
  await loadTodayEnergy()
}

async function loadTodayEnergy() {
  const device = pcsBundles.value[0]?.device
  const identifier = powerItem.value?.identifier
  if (!device || !identifier) {
    todayEnergy.value = null
    return
  }
  const start = startOfDay(new Date())
  try {
    const data = await historyMetrics(device.id, { identifier, start: start.getTime(), end: Date.now() })
    todayEnergy.value = integrate(data?.points || [])
  } catch {
    todayEnergy.value = null
  }
}

async function loadHistory() {
  const [start, end] = range.value || []
  if (!start || !end) return
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (endMs < startMs || endMs - startMs > MAX_SPAN) {
    ElMessage.warning('曲线查询跨度不能超过 31 天')
    return
  }
  historyLoading.value = true
  truncated.value = false
  try {
    const jobs = []
    if (chartMode.value !== 'soc' && pcsBundles.value[0]?.device && powerItem.value?.identifier) {
      jobs.push(loadSeries(pcsBundles.value[0].device.id, powerItem.value, '功率'))
    }
    if (chartMode.value !== 'power' && bmsBundles.value[0]?.device && socItem.value?.identifier) {
      jobs.push(loadSeries(bmsBundles.value[0].device.id, socItem.value, 'SOC'))
    }
    const series = (await Promise.all(jobs)).filter(Boolean)
    await nextTick()
    renderChart(series)
  } finally {
    historyLoading.value = false
  }
}

async function loadSeries(deviceId, item, name) {
  const [start, end] = range.value
  const data = await historyMetrics(deviceId, {
    identifier: item.identifier,
    start: start.getTime(),
    end: end.getTime()
  })
  if (data?.truncated) truncated.value = true
  const points = (data?.points || [])
    .map((point) => [point.ts, toNumber(point.value)])
    .filter((point) => point[1] !== null)
  return { name: item.name || name, unit: item.unit || '', points }
}

function renderChart(series) {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
    window.addEventListener('resize', resizeChart)
  }
  const hasSoc = series.some((item) => /soc/i.test(item.name) || item.unit === '%')
  chart.setOption({
    color: ['#3b82f6', '#16a34a'],
    grid: { left: 52, right: hasSoc ? 52 : 24, top: 36, bottom: 32 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'time' },
    yAxis: hasSoc && series.length > 1
      ? [{ type: 'value', name: series[0]?.unit || '' }, { type: 'value', name: '%', min: 0, max: 100 }]
      : { type: 'value', name: series[0]?.unit || '' },
    series: series.map((item, index) => ({
      type: 'line',
      name: item.name,
      showSymbol: false,
      smooth: true,
      yAxisIndex: hasSoc && series.length > 1 && index === 1 ? 1 : 0,
      data: item.points
    }))
  }, true)
}

function resizeChart() {
  chart?.resize()
}

function useToday() {
  range.value = todayRange()
  loadHistory()
}

function useMonth() {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  range.value = [start, end]
  loadHistory()
}

function kindOf(device) {
  const text = `${device?.deviceCode || ''} ${device?.name || ''}`.toLowerCase()
  if (text.includes('pcs')) return 'pcs'
  if (text.includes('bms')) return 'bms'
  return 'other'
}

function firstMetric(list, keys) {
  for (const bundle of list) {
    const found = findMetric(bundle.latest, keys)
    if (found) return found
  }
  return null
}

function findMetric(list, keys) {
  return (list || []).find((item) => {
    const id = String(item.identifier || '').toLowerCase()
    const tail = id.split('/').pop()
    return keys.some((key) => id === key || tail === key)
  })
}

function onlineText(list, field = 'status') {
  return `${list.length} 台 · ${countOnline(list, field)} 在线`
}

function countOnline(list, field = 'status') {
  const online = list.filter((item) => item[field] === 'ONLINE').length
  return `${online} / ${list.length}`
}

function showMetric(item, digits = 1) {
  if (!item || item.value === null || item.value === undefined || item.value === '') return '—'
  if (typeof item.value === 'boolean') return item.value ? '是' : '否'
  const number = toNumber(item.value)
  if (number === null) return String(item.value)
  const text = Number.isInteger(number) ? String(number) : number.toFixed(digits)
  return item.unit ? `${text} ${item.unit}` : text
}

function showNumber(value, digits = 1, unit = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const text = Number(value).toFixed(digits)
  return unit ? `${text} ${unit}` : text
}

function integrate(points) {
  let charge = 0
  let discharge = 0
  const sorted = [...points].filter((item) => toNumber(item.value) !== null).sort((a, b) => a.ts - b.ts)
  for (let index = 1; index < sorted.length; index += 1) {
    const hours = (sorted[index].ts - sorted[index - 1].ts) / 3600000
    if (hours <= 0 || hours > 1) continue
    const power = (toNumber(sorted[index - 1].value) + toNumber(sorted[index].value)) / 2
    if (power >= 0) discharge += power * hours
    else charge += -power * hours
  }
  return sorted.length > 1 ? { charge, discharge } : null
}

function toNumber(value) {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function runningDays(value) {
  if (!value) return null
  const start = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000))
}

function todayRange() {
  return [startOfDay(new Date()), new Date()]
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function displayText(value) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}
</script>

<template>
  <div v-loading="loading" class="monitor">
    <header class="head">
      <div>
        <div class="title-row">
          <el-select v-if="stations.length > 1" v-model="stationId" filterable class="station-select">
            <el-option v-for="item in stations" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <h2 v-else>{{ station?.name || '电站监控' }}</h2>
          <el-tag v-if="station?.status" :type="stationStatus[station.status]?.type || 'info'" effect="light">
            {{ labelOf(stationStatus, station.status) }}
          </el-tag>
          <span class="safe">安全运行：{{ runningDayText }}</span>
        </div>
        <p>{{ station?.code || '选择电站后查看运行概况' }} · {{ labelOf(stationType, station?.stationType) }}</p>
      </div>
      <el-button :disabled="!stationId" @click="loadStation">刷新</el-button>
    </header>

    <el-alert
      v-if="station && !canMetric"
      title="当前账号没有测点查询权限，实时功率和曲线无法加载。需要同时拥有「测点曲线」权限。"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="kpis">
      <article class="card">
        <div class="card-title"><i class="mark green"><el-icon><Lightning /></el-icon></i>今日充放电</div>
        <div class="metric-grid">
          <div><span>充电量</span><strong>{{ showNumber(todayEnergy?.charge, 1, 'kWh') }}</strong></div>
          <div><span>放电量</span><strong>{{ showNumber(todayEnergy?.discharge, 1, 'kWh') }}</strong></div>
          <div><span>实时有功功率</span><strong>{{ showMetric(powerItem) }}</strong></div>
        </div>
        <p class="note">按 PCS 有功功率积分。正值计入放电，负值计入充电。</p>
      </article>
      <article class="card">
        <div class="card-title"><i class="mark blue"><el-icon><DataLine /></el-icon></i>电站规模</div>
        <div class="metric-grid">
          <div><span>装机功率</span><strong>{{ showNumber(station?.capacityKw, 1, 'kW') }}</strong></div>
          <div><span>储能容量</span><strong>{{ showNumber(station?.storageKwh, 1, 'kWh') }}</strong></div>
          <div><span>并网日期</span><strong>{{ formatDate(station?.gridConnectedDate) }}</strong></div>
        </div>
      </article>
      <article class="card">
        <div class="card-title"><i class="mark orange"><el-icon><Cpu /></el-icon></i>设备状态</div>
        <div class="status-board">
          <div v-for="group in statusGroups" :key="group.key">
            <span>{{ group.label }}</span>
            <b>{{ group.text }}</b>
          </div>
        </div>
      </article>
    </section>

    <section class="mid">
      <article class="card topo-card">
        <div class="card-title">电站拓扑</div>
        <div class="hub">
          <div class="rail top" :class="`cols-${topo.top.length}`">
            <div v-for="node in topo.top" :key="node.key" class="node">
              <div class="node-icon" :class="node.tone"><el-icon><component :is="node.icon" /></el-icon></div>
              <strong>{{ node.title }}</strong>
              <span>{{ node.hint }} {{ node.value }}</span>
            </div>
          </div>
          <div class="stem" />
          <div class="rail mid">
            <div class="node">
              <div class="node-icon pcs"><el-icon><Switch /></el-icon></div>
              <strong>PCS</strong>
              <span>{{ topo.pcsValue }}</span>
            </div>
          </div>
          <div class="stem" />
          <div class="rail bottom" :class="`cols-${topo.bottom.length}`">
            <div v-for="node in topo.bottom" :key="node.key" class="node">
              <div class="node-icon" :class="node.tone"><el-icon><component :is="node.icon" /></el-icon></div>
              <strong>{{ node.title }}</strong>
              <span>{{ node.hint }} {{ node.value }}</span>
            </div>
          </div>
        </div>
        <p v-if="!devices.length" class="note">这座电站还没有设备。先在电站管理里把通讯盒、PCS、BMS 建好并绑定产品。</p>
      </article>

      <article class="card">
        <div class="card-title">运行概览</div>
        <div class="period">
          <el-button size="small" @click="useToday">今日</el-button>
          <el-button size="small" @click="useMonth">近 31 天</el-button>
        </div>
        <div class="overview">
          <div><span>当前有功功率</span><strong>{{ showMetric(powerItem) }}</strong></div>
          <div><span>当前 SOC</span><strong>{{ showMetric(socItem) }}</strong></div>
          <div><span>储能收益</span><strong>—</strong></div>
          <div><span>电价</span><strong>—</strong></div>
        </div>
        <p class="note">收益和电价还没有数据来源，这里只展示实时功率和 SOC。</p>
      </article>

      <article class="card">
        <div class="card-title">实时量</div>
        <ul class="live-list">
          <li v-for="item in sideMetrics" :key="item.label">
            <i :class="item.tone"><el-icon><component :is="item.icon" /></el-icon></i>
            <span>{{ item.label }}</span>
            <b>{{ showMetric(item.item) }}</b>
          </li>
        </ul>
      </article>
    </section>

    <section class="bottom">
      <article class="card">
        <div class="chart-bar">
          <div class="card-title">运行曲线</div>
          <el-radio-group v-model="chartMode" size="small" @change="loadHistory">
            <el-radio-button value="power">功率</el-radio-button>
            <el-radio-button value="both">功率 + SOC</el-radio-button>
            <el-radio-button value="soc">SOC</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="range"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
          />
          <el-button type="primary" :loading="historyLoading" @click="loadHistory">查询</el-button>
        </div>
        <el-alert v-if="truncated" title="结果已截断，仅返回区间内最多 5000 个点" type="warning" show-icon :closable="false" />
        <div ref="chartRef" class="chart" />
      </article>
      <article class="card info">
        <div class="card-title">电站资料</div>
        <img v-if="station?.coverUrl" class="cover" :src="station.coverUrl" alt="电站图片" />
        <p v-else class="note">还没有电站图片。可在电站编辑里上传。</p>
        <dl>
          <div><dt>名称</dt><dd>{{ displayText(station?.name) }}</dd></div>
          <div><dt>编码</dt><dd>{{ displayText(station?.code) }}</dd></div>
          <div><dt>类型</dt><dd>{{ labelOf(stationType, station?.stationType) }}</dd></div>
          <div><dt>地址</dt><dd>{{ displayText(station?.address) }}</dd></div>
          <div><dt>时区</dt><dd>{{ displayText(station?.timezone) }}</dd></div>
          <div><dt>网关</dt><dd>{{ gateways.map((item) => item.name).join('、') || '—' }}</dd></div>
        </dl>
      </article>
    </section>
  </div>
</template>

<style scoped>
.monitor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head,
.title-row,
.chart-bar,
.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head {
  justify-content: space-between;
}

.head h2,
.card-title {
  margin: 0;
  font-size: 16px;
}

.head p,
.note,
.safe {
  margin: 4px 0 0;
  color: var(--ems-muted);
  font-size: 13px;
}

.safe {
  margin: 0;
}

.station-select {
  width: 280px;
}

.kpis,
.mid,
.bottom {
  display: grid;
  gap: 12px;
}

.kpis {
  grid-template-columns: 1.3fr 1.1fr 0.8fr;
}

.kpis .card {
  padding: 10px 14px;
}

.kpis .mark {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 14px;
}

.kpis .card-title {
  font-size: 14px;
}

.kpis .metric-grid {
  margin-top: 8px;
  gap: 8px;
}

.kpis .metric-grid strong {
  margin-top: 2px;
  font-size: 16px;
}

.kpis .note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.35;
}

.mid {
  grid-template-columns: 1.45fr 0.85fr 0.75fr;
}

.bottom {
  grid-template-columns: 1.7fr 0.8fr;
}

.card {
  background: #fff;
  border: 1px solid var(--ems-line);
  border-radius: 12px;
  padding: 14px 16px;
}

.mark,
.live-list i,
.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background-color: var(--glass, rgba(15, 118, 110, 0.55));
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.18) 42%, rgba(255, 255, 255, 0.08) 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.95),
    inset 0 -8px 12px rgba(255, 255, 255, 0.22),
    0 6px 12px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(8px);
}

.green { --glass: rgba(22, 163, 74, 0.55); }
.blue { --glass: rgba(37, 99, 235, 0.55); }
.orange { --glass: rgba(249, 115, 22, 0.55); }
.cyan { --glass: rgba(8, 145, 178, 0.55); }
.red { --glass: rgba(225, 29, 72, 0.55); }
.node-icon.grid { --glass: rgba(37, 99, 235, 0.55); }
.node-icon.pcs { --glass: rgba(249, 115, 22, 0.55); }
.node-icon.bms { --glass: rgba(22, 163, 74, 0.55); }
.node-icon.load { --glass: rgba(124, 58, 237, 0.55); }
.node-icon.pv { --glass: rgba(234, 179, 8, 0.62); }
.node-icon.charge { --glass: rgba(8, 145, 178, 0.55); }

.metric-grid,
.overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.overview {
  grid-template-columns: 1fr 1fr;
}

.metric-grid span,
.overview span,
.live-list span,
.info dt {
  display: block;
  color: var(--ems-muted);
  font-size: 12px;
}

.metric-grid strong,
.overview strong,
.live-list b {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.live-list,
.info dl {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}

.live-list li,
.info dl div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f1f5f9;
}

.live-list li {
  align-items: center;
  justify-content: flex-start;
}

.live-list i {
  flex-shrink: 0;
}

.live-list b {
  margin-left: auto;
  font-size: 14px;
}

.status-board {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.status-board > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.status-board span {
  color: var(--ems-muted);
  font-size: 12px;
  flex-shrink: 0;
}

.status-board b {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.hub {
  --topo-icon: 64px;
  height: 500px;
  margin-top: 8px;
  display: grid;
  grid-template-rows: auto 1fr auto 1fr auto;
}

.rail {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
  align-items: center;
}

.rail.mid {
  grid-template-columns: 1fr;
}

.rail.cols-1 .node { grid-column: 2; }
.rail.cols-2 .node:first-child { grid-column: 1; }
.rail.cols-2 .node:last-child { grid-column: 3; }
.rail.cols-3 .node:nth-child(1) { grid-column: 1; }
.rail.cols-3 .node:nth-child(2) { grid-column: 2; }
.rail.cols-3 .node:nth-child(3) { grid-column: 3; }

.rail.cols-2::before,
.rail.cols-3::before {
  content: "";
  position: absolute;
  left: 16.67%;
  right: 16.67%;
  height: 2px;
  background: #94a3b8;
}

.rail.top::before { bottom: 0; }
.rail.bottom::before { top: 0; }

.stem {
  position: relative;
}

.stem::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: #94a3b8;
  transform: translateX(-50%);
}

.node {
  position: relative;
  z-index: 1;
  width: max-content;
  padding: 0 6px;
  text-align: center;
  background: #fff;
  border-radius: 12px;
}

.rail.bottom .node {
  background: transparent;
  transform: translateY(calc(var(--topo-icon) / -2));
}

.node strong,
.node span {
  display: block;
}

.node span {
  margin-top: 2px;
  color: var(--ems-muted);
  font-size: 12px;
  white-space: nowrap;
}

.node-icon {
  position: relative;
  z-index: 1;
  width: var(--topo-icon);
  height: var(--topo-icon);
  margin: 0 auto 6px;
  border-radius: 18px;
  font-size: 28px;
}

.period {
  margin-top: 12px;
}

.chart {
  height: 320px;
  margin-top: 8px;
}

.chart-bar {
  flex-wrap: wrap;
}

.info dd {
  margin: 0;
  text-align: right;
}

.cover {
  width: 100%;
  height: 140px;
  margin-top: 12px;
  object-fit: cover;
  border-radius: 10px;
  background: #f8fafc;
}

@media (max-width: 1100px) {
  .kpis,
  .mid,
  .bottom,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
