<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AddressPicker from '@/components/AddressPicker.vue'
import StationImages from '@/components/StationImages.vue'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import { createStation, deleteStation, pageStations, updateStation } from '@/api/asset'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { optionsOf, stationStatus, stationType } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { display, formatDate, formatDateTime } from '@/utils/format'

const user = useUserStore()
const filters = reactive({ name: '', stationType: '', status: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageStations({ ...page, ...filters }))
const visible = ref(false)
const mapReady = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

function blank() {
  return {
    code: '',
    name: '',
    stationType: 'STORAGE',
    address: '',
    longitude: null,
    latitude: null,
    timezone: 'Asia/Shanghai',
    capacityKw: null,
    storageKwh: null,
    gridConnectedDate: null,
    status: 'BUILDING'
  }
}

function openCreate() {
  Object.assign(form, { id: undefined, ...blank() })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    code: row.code,
    name: row.name,
    stationType: row.stationType,
    address: row.address,
    longitude: row.longitude,
    latitude: row.latitude,
    timezone: row.timezone || 'Asia/Shanghai',
    capacityKw: row.capacityKw,
    storageKwh: row.storageKwh,
    gridConnectedDate: row.gridConnectedDate,
    status: row.status
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, [
    'code', 'name', 'stationType', 'address', 'longitude', 'latitude', 'timezone',
    'capacityKw', 'storageKwh', 'gridConnectedDate', 'status'
  ])
  saving.value = true
  try {
    if (form.id) await updateStation(form.id, body)
    else await createStation(body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteStation(row.id)
  ElMessage.success('已删除')
  await load()
}

load()
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-input v-model="filters.name" clearable placeholder="电站名称" style="width: 180px" @keyup.enter="search" />
        <el-select v-model="filters.stationType" clearable placeholder="类型" style="width: 140px">
          <el-option v-for="item in optionsOf(stationType)" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="item in optionsOf(stationStatus)" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('station:station:add')" type="primary" @click="openCreate">新建电站</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="code" label="编码" min-width="120" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }"><DictTag :value="row.stationType" :map="stationType" /></template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column label="容量 kW" width="110">
          <template #default="{ row }">{{ display(row.capacityKw) }}</template>
        </el-table-column>
        <el-table-column label="储能 kWh" width="110">
          <template #default="{ row }">{{ display(row.storageKwh) }}</template>
        </el-table-column>
        <el-table-column label="并网日期" width="120">
          <template #default="{ row }">{{ formatDate(row.gridConnectedDate) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><DictTag :value="row.status" :map="stationStatus" /></template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('station:station:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('station:station:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog
      v-model="visible"
      :title="form.id ? '编辑电站' : '新建电站'"
      width="760px"
      @opened="mapReady = true"
      @closed="mapReady = false"
    >
      <el-form ref="formRef" :model="form" label-width="108px">
        <el-form-item label="编码" prop="code" :rules="[{ required: true, max: 32, message: '请输入不超过 32 位的编码' }]">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入不超过 64 位的名称' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型" prop="stationType" :rules="[{ required: true, message: '请选择类型' }]">
          <el-select v-model="form.stationType">
            <el-option v-for="item in optionsOf(stationType)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status" :rules="[{ required: true, message: '请选择状态' }]">
          <el-select v-model="form.status">
            <el-option v-for="item in optionsOf(stationStatus)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="地图选点">
          <AddressPicker
            v-if="mapReady"
            v-model:address="form.address"
            v-model:longitude="form.longitude"
            v-model:latitude="form.latitude"
          />
        </el-form-item>
        <el-form-item label="地址" prop="address" :rules="[{ max: 255, message: '不超过 255 个字符' }]">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number v-model="form.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number v-model="form.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" />
        </el-form-item>
        <el-form-item label="时区" prop="timezone" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.timezone" />
        </el-form-item>
        <el-form-item label="装机容量 kW"><el-input-number v-model="form.capacityKw" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="储能容量 kWh"><el-input-number v-model="form.storageKwh" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="并网日期">
          <el-date-picker v-model="form.gridConnectedDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="form.id" label="电站图片">
          <StationImages :station-id="form.id" @change="load" />
        </el-form-item>
        <el-form-item v-else label="电站图片">
          <span class="image-hint">保存电站后可以上传图片。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.image-hint {
  color: var(--ems-muted);
  font-size: 13px;
}
</style>
