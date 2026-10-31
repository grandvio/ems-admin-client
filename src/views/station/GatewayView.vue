<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import { createGateway, deleteGateway, pageGateways, pageStations, updateGateway } from '@/api/asset'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { onlineStatus, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { formatDateTime } from '@/utils/format'
import { listAll } from '@/utils/tree'

const user = useUserStore()
const stations = ref([])
const filters = reactive({ stationId: null, name: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageGateways({ ...page, ...filters }))
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

onMounted(async () => {
  stations.value = await listAll(pageStations)
  await load()
})

function stationName(id) {
  return stations.value.find((item) => item.id === id)?.name || id
}

function openCreate() {
  Object.assign(form, {
    id: undefined,
    stationId: filters.stationId,
    name: '',
    groupId: '',
    edgeNodeId: '',
    onlineStatus: 'OFFLINE'
  })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    stationId: row.stationId,
    name: row.name,
    groupId: row.groupId,
    edgeNodeId: row.edgeNodeId,
    onlineStatus: row.onlineStatus || 'OFFLINE'
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['stationId', 'name', 'groupId', 'edgeNodeId', 'onlineStatus'])
  saving.value = true
  try {
    if (form.id) await updateGateway(form.id, body)
    else await createGateway(body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteGateway(row.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-select v-model="filters.stationId" clearable filterable placeholder="电站" style="width: 200px">
          <el-option v-for="item in stations" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-input v-model="filters.name" clearable placeholder="网关名称" style="width: 180px" @keyup.enter="search" />
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('station:gateway:add')" type="primary" @click="openCreate">新建网关</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column label="电站" min-width="140">
          <template #default="{ row }">{{ stationName(row.stationId) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="groupId" label="Group" min-width="140" />
        <el-table-column prop="edgeNodeId" label="Edge Node" min-width="140" />
        <el-table-column label="在线状态" width="110">
          <template #default="{ row }"><DictTag :value="row.onlineStatus" :map="onlineStatus" /></template>
        </el-table-column>
        <el-table-column label="最近上线" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.lastBirthAt) }}</template>
        </el-table-column>
        <el-table-column label="最近离线" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.lastDeathAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('station:gateway:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('station:gateway:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑网关' : '新建网关'" width="560px">
      <el-form ref="formRef" :model="form" label-width="120px">
        <el-form-item label="电站" prop="stationId" :rules="[{ required: true, message: '请选择电站' }]">
          <el-select v-model="form.stationId" filterable style="width: 100%">
            <el-option v-for="item in stations" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入不超过 64 位的名称' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Group" prop="groupId" :rules="[{ required: true, max: 64, message: '请输入 Sparkplug Group' }]">
          <el-input v-model="form.groupId" />
        </el-form-item>
        <el-form-item label="Edge Node" prop="edgeNodeId" :rules="[{ required: true, max: 64, message: '请输入 Edge Node' }]">
          <el-input v-model="form.edgeNodeId" />
        </el-form-item>
        <el-form-item label="在线状态" prop="onlineStatus">
          <el-select v-model="form.onlineStatus">
            <el-option v-for="item in optionsOf(onlineStatus)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
