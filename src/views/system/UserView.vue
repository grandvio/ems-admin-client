<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import { createUser, deleteUser, getUser, pageRoles, pageUsers, updateUser } from '@/api/system'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { optionsOf, userStatus } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { formatDateTime } from '@/utils/format'
import { listAll } from '@/utils/tree'

const user = useUserStore()
const filters = reactive({ username: '', nickname: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageUsers({ ...page, ...filters }))
const roles = ref([])
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

onMounted(async () => {
  if (user.hasPerm('system:role:list')) {
    roles.value = await listAll(pageRoles)
  }
  await load()
})

function openCreate() {
  Object.assign(form, {
    id: undefined,
    username: '',
    password: '',
    nickname: '',
    phone: '',
    status: 'ENABLED',
    roleIds: []
  })
  visible.value = true
}

async function openEdit(row) {
  const detail = await getUser(row.id)
  Object.assign(form, {
    id: detail.id,
    nickname: detail.nickname,
    phone: detail.phone,
    status: detail.status,
    roleIds: detail.roleIds || []
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateUser(form.id, payload(form, ['nickname', 'phone', 'status', 'roleIds']))
    } else {
      await createUser(payload(form, ['username', 'password', 'nickname', 'phone', 'status', 'roleIds']))
    }
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.username)
  await deleteUser(row.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-input v-model="filters.username" clearable placeholder="用户名" style="width: 180px" @keyup.enter="search" />
        <el-input v-model="filters.nickname" clearable placeholder="昵称" style="width: 180px" @keyup.enter="search" />
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('system:user:add')" type="primary" @click="openCreate">新建用户</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机" min-width="130" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><DictTag :value="row.status" :map="userStatus" /></template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('system:user:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="user.hasPerm('system:user:remove') && row.id !== user.info?.userId"
              link
              type="danger"
              @click="remove(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑用户' : '新建用户'" width="520px">
      <el-form ref="formRef" :model="form" label-width="88px">
        <el-form-item v-if="!form.id" label="用户名" prop="username" :rules="[{ required: true, pattern: /^[A-Za-z0-9_]{4,32}$/, message: '4-32 位字母、数字或下划线' }]">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码" prop="password" :rules="[{ required: true, min: 6, max: 64, message: '密码长度为 6 到 64 位' }]">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="手机" prop="phone" :rules="[{ max: 20, message: '不超过 20 个字符' }]">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="状态" prop="status" :rules="[{ required: true, message: '请选择状态' }]">
          <el-select v-model="form.status">
            <el-option v-for="item in optionsOf(userStatus)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select v-model="form.roleIds" multiple filterable style="width: 100%">
            <el-option v-for="item in roles" :key="item.id" :label="`${item.name}（${item.code}）`" :value="item.id" />
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
