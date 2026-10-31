<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import { createTenant, deleteTenant, pageTenants, updateTenant } from '@/api/system'
import { useTable } from '@/composables/useTable'
import { userStatus, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { formatDateTime } from '@/utils/format'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const filters = reactive({ name: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageTenants({ ...page, ...filters }))
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

function blank() {
  return {
    name: '',
    code: '',
    contact: '',
    adminUsername: '',
    adminPassword: '',
    adminNickname: '',
    status: 'ENABLED'
  }
}

function openCreate() {
  Object.assign(form, { id: undefined, ...blank() })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    contact: row.contact,
    status: row.status
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateTenant(form.id, payload(form, ['name', 'contact', 'status']))
    } else {
      await createTenant(payload(form, ['name', 'code', 'contact', 'adminUsername', 'adminPassword', 'adminNickname']))
    }
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteTenant(row.id)
  ElMessage.success('已删除')
  await load()
}

load()
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-input v-model="filters.name" clearable placeholder="租户名称" style="width: 220px" @keyup.enter="search" />
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('system:tenant:add')" type="primary" @click="openCreate">新建租户</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="code" label="编码" min-width="120" />
        <el-table-column prop="contact" label="联系人" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><DictTag :value="row.status" :map="userStatus" /></template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('system:tenant:edit') && row.id !== 0" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('system:tenant:remove') && row.id !== 0" link type="danger" @click="remove(row)">删除</el-button>
            <span v-if="row.id === 0">平台租户</span>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑租户' : '新建租户'" width="520px">
      <el-form ref="formRef" :model="form" label-width="108px">
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入名称' }, { max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item v-if="!form.id" label="编码" prop="code" :rules="[{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '2-32 位字母、数字、下划线或中划线' }]">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.contact" />
        </el-form-item>
        <template v-if="!form.id">
          <el-form-item label="管理员账号" prop="adminUsername" :rules="[{ required: true, pattern: /^[A-Za-z0-9_]{4,32}$/, message: '4-32 位字母、数字或下划线' }]">
            <el-input v-model="form.adminUsername" />
          </el-form-item>
          <el-form-item label="管理员密码" prop="adminPassword" :rules="[{ required: true, min: 6, max: 64, message: '密码长度为 6 到 64 位' }]">
            <el-input v-model="form.adminPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="管理员昵称" prop="adminNickname" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
            <el-input v-model="form.adminNickname" />
          </el-form-item>
        </template>
        <el-form-item v-else label="状态" prop="status" :rules="[{ required: true, message: '请选择状态' }]">
          <el-select v-model="form.status">
            <el-option v-for="item in optionsOf(userStatus)" :key="item.value" :label="item.label" :value="item.value" />
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
