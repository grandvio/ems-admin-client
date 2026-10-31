<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import { createProduct, deleteProduct, pageProducts, publishProduct, updateProduct } from '@/api/thing'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { optionsOf, productStatus } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const user = useUserStore()
const filters = reactive({ name: '', status: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageProducts({ ...page, ...filters }))
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

function openCreate() {
  Object.assign(form, { id: undefined, code: '', name: '', description: '' })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, { id: row.id, code: row.code, name: row.name, description: row.description })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['code', 'name', 'description'])
  saving.value = true
  try {
    if (form.id) await updateProduct(form.id, body)
    else await createProduct(body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function publish(row) {
  await ElMessageBox.confirm(`发布「${row.name}」会把模型版本加 1。已绑定设备仍保留绑定时的版本。`, '发布产品', {
    type: 'warning'
  })
  const version = await publishProduct(row.id)
  ElMessage.success(`已发布，当前版本 ${version}`)
  await load()
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteProduct(row.id)
  ElMessage.success('已删除')
  await load()
}

function openModel(path, row) {
  router.push({ path, query: { productId: row.id } })
}

load()
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-input v-model="filters.name" clearable placeholder="产品名称" style="width: 180px" @keyup.enter="search" />
        <el-select v-model="filters.status" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="item in optionsOf(productStatus)" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('thing:product:add')" type="primary" @click="openCreate">新建产品</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="code" label="编码" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><DictTag :value="row.status" :map="productStatus" /></template>
        </el-table-column>
        <el-table-column prop="modelVersion" label="版本" width="80" />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('thing:property:list')" link type="primary" @click="openModel('/thing/property', row)">属性</el-button>
            <el-button v-if="user.hasPerm('thing:event:list')" link type="primary" @click="openModel('/thing/event', row)">事件</el-button>
            <el-button v-if="user.hasPerm('thing:service:list')" link type="primary" @click="openModel('/thing/service', row)">服务</el-button>
            <el-button v-if="user.hasPerm('thing:product:publish')" link type="primary" @click="publish(row)">发布</el-button>
            <el-button v-if="user.hasPerm('thing:product:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('thing:product:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑产品' : '新建产品'" width="520px">
      <el-form ref="formRef" :model="form" label-width="72px">
        <el-form-item label="编码" prop="code" :rules="[{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '2-32 位字母、数字、下划线或中划线' }]">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, max: 64, message: '请输入不超过 64 位的名称' }]">
          <el-input v-model="form.name" />
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
