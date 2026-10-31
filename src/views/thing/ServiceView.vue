<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createService, deleteService, listServices, pageProducts, updateService } from '@/api/thing'
import { useUserStore } from '@/stores/user'
import { confirmRemove, payload } from '@/utils/feedback'
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
    rows.value = await listServices(productId.value)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: undefined, identifier: '', name: '', inputParams: '', description: '' })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    identifier: row.identifier,
    name: row.name,
    inputParams: row.inputParams,
    description: row.description
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['identifier', 'name', 'inputParams', 'description'])
  saving.value = true
  try {
    if (form.id) await updateService(productId.value, form.id, body)
    else await createService(productId.value, body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteService(productId.value, row.id)
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
        <el-button v-if="user.hasPerm('thing:service:add')" type="primary" :disabled="!productId" @click="openCreate">新建服务</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="identifier" label="标识" min-width="160" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="inputParams" label="入参" min-width="220" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('thing:service:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('thing:service:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑服务' : '新建服务'" width="560px">
      <el-form ref="formRef" :model="form" label-width="72px">
        <el-form-item label="标识" prop="identifier" :rules="identifierRule">
          <el-input v-model="form.identifier" />
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入名称' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="入参" prop="inputParams" :rules="[{ max: 2000, message: '不超过 2000 个字符' }]">
          <el-input v-model="form.inputParams" type="textarea" :rows="4" placeholder="JSON 文本，可留空" />
        </el-form-item>
        <el-form-item label="说明" prop="description" :rules="[{ max: 500, message: '不超过 500 个字符' }]">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
