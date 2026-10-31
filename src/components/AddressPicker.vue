<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const longitude = defineModel('longitude')
const latitude = defineModel('latitude')
const address = defineModel('address')

const provider = ref('amap')
const amapKey = import.meta.env.VITE_AMAP_KEY || ''
const amapSecurity = import.meta.env.VITE_AMAP_SECURITY_JS_CODE || ''
const mapEl = ref()
const searchRef = ref()
const loading = ref(false)
const error = ref('')
let map
let marker
let geocoder
let writing = false

onMounted(() => {
  if (provider.value === 'amap') nextTick(initAmap)
})

onBeforeUnmount(destroyMap)

watch(provider, async (value) => {
  destroyMap()
  error.value = ''
  if (value === 'amap') {
    await nextTick()
    initAmap()
  }
})

watch([longitude, latitude], () => {
  if (writing || !map || !marker || provider.value !== 'amap') return
  if (!hasPoint()) {
    marker.hide()
    return
  }
  const position = currentPosition()
  marker.setPosition(position)
  marker.show()
  map.setCenter(position)
})

async function initAmap() {
  if (!amapKey || !mapEl.value) return
  loading.value = true
  error.value = ''
  try {
    const AMap = await ensureAmap(amapKey, amapSecurity)
    const center = hasPoint() ? currentPosition() : [113.2644, 23.1291]
    map = new AMap.Map(mapEl.value, {
      zoom: hasPoint() ? 16 : 5,
      center
    })
    marker = new AMap.Marker({
      map,
      position: center,
      visible: hasPoint(),
      draggable: true
    })
    geocoder = new AMap.Geocoder()
    map.on('click', (event) => {
      applyPoint(event.lnglat.getLat(), event.lnglat.getLng(), true)
    })
    marker.on('dragend', (event) => {
      applyPoint(event.lnglat.getLat(), event.lnglat.getLng(), true)
    })
    const input = searchRef.value?.input
    if (input) {
      const autocomplete = new AMap.AutoComplete({ input })
      autocomplete.on('select', (event) => selectPoi(event.poi))
    }
    map.resize()
  } catch (err) {
    error.value = err?.message || '高德地图加载失败'
  } finally {
    loading.value = false
  }
}

function selectPoi(poi) {
  if (!poi) return
  const text = [poi.district, poi.address, poi.name].filter(Boolean).join('')
  if (text) address.value = text.slice(0, 255)
  if (poi.location) {
    applyPoint(poi.location.lat, poi.location.lng, false)
    map.setZoomAndCenter(16, [poi.location.lng, poi.location.lat])
    return
  }
  const placeSearch = new window.AMap.PlaceSearch()
  placeSearch.search(poi.name, (status, result) => {
    const location = result?.poiList?.pois?.[0]?.location
    if (status !== 'complete' || !location) return
    applyPoint(location.lat, location.lng, false)
    map.setZoomAndCenter(16, [location.lng, location.lat])
  })
}

function applyPoint(lat, lng, shouldGeocode) {
  const nextLatitude = round6(lat)
  const nextLongitude = round6(lng)
  writing = true
  latitude.value = nextLatitude
  longitude.value = nextLongitude
  writing = false
  const position = [nextLongitude, nextLatitude]
  marker.setPosition(position)
  marker.show()
  map.setCenter(position)
  if (shouldGeocode) reverseGeocode(position)
}

function reverseGeocode(position) {
  geocoder.getAddress(position, (status, result) => {
    if (status === 'complete' && result?.regeocode?.formattedAddress) {
      address.value = result.regeocode.formattedAddress.slice(0, 255)
    }
  })
}

function destroyMap() {
  map?.destroy?.()
  map = null
  marker = null
  geocoder = null
}

function hasPoint() {
  return Number.isFinite(Number(latitude.value)) && Number.isFinite(Number(longitude.value))
    && latitude.value !== null && longitude.value !== null && latitude.value !== '' && longitude.value !== ''
}

function currentPosition() {
  return [Number(longitude.value), Number(latitude.value)]
}

function round6(value) {
  return Math.round(Number(value) * 1e6) / 1e6
}

function ensureAmap(key, securityJsCode) {
  if (window.AMap?.Map) return Promise.resolve(window.AMap)
  if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode }
  }
  if (!window.__emsAmap) {
    window.__emsAmap = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.AutoComplete,AMap.PlaceSearch,AMap.Geocoder`
      script.async = true
      script.onload = () => {
        if (window.AMap) resolve(window.AMap)
        else {
          window.__emsAmap = null
          reject(new Error('高德地图没有正确初始化'))
        }
      }
      script.onerror = () => {
        window.__emsAmap = null
        reject(new Error('高德地图脚本加载失败，请检查 Key 和安全密钥'))
      }
      document.head.appendChild(script)
    })
  }
  return window.__emsAmap
}
</script>

<template>
  <div class="picker">
    <el-radio-group v-model="provider" size="small">
      <el-radio-button value="amap">高德地图</el-radio-button>
      <el-radio-button value="google">谷歌地图</el-radio-button>
    </el-radio-group>

    <el-alert
      v-if="provider === 'google'"
      class="gap"
      type="info"
      show-icon
      :closable="false"
      title="谷歌地图暂未接入。请先使用高德地图选点。"
    />

    <template v-else>
      <el-alert
        v-if="!amapKey"
        class="gap"
        type="info"
        show-icon
        :closable="false"
        title="未配置高德地图。在 .env.development 填写 VITE_AMAP_KEY 和 VITE_AMAP_SECURITY_JS_CODE 后重启前端。"
      />
      <template v-else>
        <el-input
          ref="searchRef"
          class="gap"
          clearable
          placeholder="搜索地址，例如：深圳市龙岗区龙光城"
          @keydown.enter.prevent
        />
        <div v-loading="loading" class="map">
          <div ref="mapEl" class="canvas" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-else class="hint">搜索结果、点击地图或拖动标记后，会自动填入地址和经纬度。</p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.picker {
  width: 100%;
}

.gap {
  margin-top: 8px;
}

.map {
  height: 280px;
  margin-top: 8px;
  border: 1px solid var(--ems-line);
  border-radius: 8px;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
}

.hint,
.error {
  margin: 6px 0 0;
  font-size: 12px;
}

.hint {
  color: var(--ems-muted);
}

.error {
  color: #b91c1c;
}
</style>

<style>
.amap-sug-result {
  z-index: 5000 !important;
}
</style>
