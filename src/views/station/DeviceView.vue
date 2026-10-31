<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import {
  bindDeviceProduct,
  createDevice,
  deleteDevice,
  pageDevices,
  pageGateways,
  pageStations,
  updateDevice
} from '@/api/asset'
import { pageProducts } from '@/api/thing'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { deviceStatus, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { display, formatDateTime } from '@/utils/format'
import { listAll } from '@/utils/tree'

const user = useUserStore()
const stations = ref([])
const gateways = ref([])
const products = ref([])
const filters = reactive({ stationId: null, gatewayId: null, name: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageDevices({ ...page, ...filters }))
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})
const bindVisible = ref(false)
const bindSaving = ref(false)
const bindForm = reactive({ id: null, name: '', productId: null })

const gatewayOptions = computed(() => {
  if (!filters.stationId) return gateways.value
  return gateways.value.filter((item) => item.stationId === filters.stationId)
})

onMounted(async () => {
  const jobs = [listAll(pageStations), listAll(pageGateways)]
  if (user.hasPerm('thing:product:list')) jobs.push(listAll(pageProducts, { status: 'PUBLISHED' }))
  const [stationRows, gatewayRows, productRows] = await Promise.all(jobs)
  stations.value = stationRows
  gateways.value = gatewayRows
  products.value = productRows || []
  await load()
})

function nameOf(list, id) {
  return list.find((item) => item.id === id)?.name || (id ?? '—')
}

function openCreate() {
  Object.assign(form, {
    id: undefined,
    gatewayId: filters.gatewayId,
    name: '',
    deviceCode: '',
    sn: '',
    status: 'INACTIVE'
  })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    gatewayId: row.gatewayId,
    name: row.name,
    deviceCode: row.deviceCode,
    sn: row.sn,
    status: row.status || 'INACTIVE'
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['gatewayId', 'name', 'deviceCode', 'sn', 'status'])
  saving.value = true
  try {
    if (form.id) await updateDevice(form.id, body)
    else await createDevice(body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteDevice(row.id)
  ElMessage.success('已删除')
  await load()
}

function openBind(row) {
  bindForm.id = row.id
  bindForm.name = row.name
  bindForm.productId = row.productId
  bindVisible.value = true
}

async function saveBind() {
  if (!bindForm.productId) {
    ElMessage.warning('请选择已发布产品')
    return
  }
  bindSaving.value = true
  try {
    await bindDeviceProduct(bindForm.id, bindForm.productId)
    ElMessage.success('产品已绑定')
    bindVisible.value = false
    await load()
  } finally {
    bindSaving.value = false
  }
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-select v-model="filters.stationId" clearable filterable placeholder="电站" style="width: 180px">
          <el-option v-for="item in stations" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="filters.gatewayId" clearable filterable placeholder="网关" style="width: 180px">
          <el-option v-for="item in gatewayOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-input v-model="filters.name" clearable placeholder="设备名称" style="width: 180px" @keyup.enter="search" />
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('station:device:add')" type="primary" @click="openCreate">新建设备</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column label="电站" min-width="120">
          <template #default="{ row }">{{ nameOf(stations, row.stationId) }}</template>
        </el-table-column>
        <el-table-column label="网关" min-width="120">
          <template #default="{ row }">{{ nameOf(gateways, row.gatewayId) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="deviceCode" label="设备标识" min-width="140" />
        <el-table-column prop="sn" label="序列号" min-width="140" />
        <el-table-column label="产品" min-width="140">
          <template #default="{ row }">{{ nameOf(products, row.productId) }}</template>
        </el-table-column>
        <el-table-column label="模型版本" width="100">
          <template #default="{ row }">{{ display(row.modelVersion) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><DictTag :value="row.status" :map="deviceStatus" /></template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('station:device:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('station:device:edit') && user.hasPerm('thing:product:list')" link type="primary" @click="openBind(row)">绑定产品</el-button>
            <el-button v-if="user.hasPerm('station:device:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑设备' : '新建设备'" width="560px">
      <el-form ref="formRef" :model="form" label-width="96px">
        <el-form-item label="网关" prop="gatewayId" :rules="[{ required: true, message: '请选择网关' }]">
          <el-select v-model="form.gatewayId" filterable style="width: 100%">
            <el-option v-for="item in gateways" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入不超过 64 位的名称' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="设备标识" prop="deviceCode" :rules="[{ required: true, max: 64, message: '请输入设备标识' }]">
          <el-input v-model="form.deviceCode" />
        </el-form-item>
        <el-form-item label="序列号" prop="sn" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.sn" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status">
            <el-option v-for="item in optionsOf(deviceStatus)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bindVisible" :title="`绑定产品 · ${bindForm.name}`" width="480px">
      <el-select v-model="bindForm.productId" filterable style="width: 100%" placeholder="只能绑定已发布产品">
        <el-option
          v-for="item in products"
          :key="item.id"
          :label="`${item.name}（${item.code} / v${item.modelVersion}）`"
          :value="item.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" :loading="bindSaving" @click="saveBind">绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
