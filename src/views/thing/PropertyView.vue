<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import { createProperty, deleteProperty, listProperties, pageProducts, updateProperty } from '@/api/thing'
import { useUserStore } from '@/stores/user'
import { accessMode, dataType, groupCode, labelOf, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { display } from '@/utils/format'
import { listAll } from '@/utils/tree'

const route = useRoute()
const user = useUserStore()
const products = ref([])
const productId = ref(route.query.productId ? Number(route.query.productId) : null)
const loading = ref(false)
const rows = ref([])
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})
const identifierRule = [{ required: true, pattern: /^[A-Za-z0-9_./-]{1,128}$/, message: '1-128 位字母、数字、下划线、点、斜线或中划线' }]

onMounted(async () => {
  products.value = await listAll(pageProducts)
  const before = productId.value
  if (!products.value.some((item) => item.id === productId.value)) {
    productId.value = products.value[0]?.id ?? null
  }
  if (productId.value === before) await load()
})

watch(productId, () => load())

async function load() {
  if (!productId.value) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    rows.value = await listProperties(productId.value)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, {
    id: undefined,
    identifier: '',
    name: '',
    dataType: 'float',
    unit: '',
    accessMode: 'r',
    minValue: null,
    maxValue: null,
    groupCode: 'TELEMETRY'
  })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    identifier: row.identifier,
    name: row.name,
    dataType: row.dataType,
    unit: row.unit,
    accessMode: row.accessMode,
    minValue: row.minValue,
    maxValue: row.maxValue,
    groupCode: row.groupCode
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['identifier', 'name', 'dataType', 'unit', 'accessMode', 'minValue', 'maxValue', 'groupCode'])
  saving.value = true
  try {
    if (form.id) await updateProperty(productId.value, form.id, body)
    else await createProperty(productId.value, body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteProperty(productId.value, row.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-select v-model="productId" filterable placeholder="选择产品" style="width: 260px">
          <el-option v-for="item in products" :key="item.id" :label="`${item.name}（${item.code}）`" :value="item.id" />
        </el-select>
        <span class="grow" />
        <el-button v-if="user.hasPerm('thing:property:add')" type="primary" :disabled="!productId" @click="openCreate">新建属性</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="identifier" label="标识" min-width="160" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ labelOf(dataType, row.dataType) }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="90" />
        <el-table-column label="读写" width="90">
          <template #default="{ row }"><DictTag :value="row.accessMode" :map="accessMode" /></template>
        </el-table-column>
        <el-table-column label="最小值" width="100">
          <template #default="{ row }">{{ display(row.minValue) }}</template>
        </el-table-column>
        <el-table-column label="最大值" width="100">
          <template #default="{ row }">{{ display(row.maxValue) }}</template>
        </el-table-column>
        <el-table-column label="分组" width="100">
          <template #default="{ row }"><DictTag :value="row.groupCode" :map="groupCode" /></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('thing:property:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('thing:property:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑属性' : '新建属性'" width="560px">
      <el-form ref="formRef" :model="form" label-width="88px">
        <el-form-item label="标识" prop="identifier" :rules="identifierRule">
          <el-input v-model="form.identifier" />
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入名称' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型" prop="dataType" :rules="[{ required: true, message: '请选择类型' }]">
          <el-select v-model="form.dataType">
            <el-option v-for="item in optionsOf(dataType)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit" :rules="[{ max: 32, message: '不超过 32 个字符' }]">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="读写" prop="accessMode" :rules="[{ required: true, message: '请选择读写模式' }]">
          <el-select v-model="form.accessMode">
            <el-option v-for="item in optionsOf(accessMode)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组" prop="groupCode" :rules="[{ required: true, message: '请选择分组' }]">
          <el-select v-model="form.groupCode">
            <el-option v-for="item in optionsOf(groupCode)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="最小值"><el-input-number v-model="form.minValue" :precision="4" /></el-form-item>
        <el-form-item label="最大值"><el-input-number v-model="form.maxValue" :precision="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
