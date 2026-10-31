<script setup>
import { nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import Pager from '@/components/Pager.vue'
import {
  assignRoleMenus,
  assignRoleStations,
  createRole,
  deleteRole,
  getRole,
  menuTree,
  pageRoles,
  updateRole
} from '@/api/system'
import { pageStations } from '@/api/asset'
import { useTable } from '@/composables/useTable'
import { useUserStore } from '@/stores/user'
import { dataScope, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { listAll, trimTree } from '@/utils/tree'

const user = useUserStore()
const filters = reactive({ name: '' })
const { loading, rows, total, query, load, search } = useTable((page) => pageRoles({ ...page, ...filters }))
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

const menuVisible = ref(false)
const menuSaving = ref(false)
const menuNodes = ref([])
const menuTreeRef = ref()
const currentRole = ref(null)

const stationVisible = ref(false)
const stationSaving = ref(false)
const stations = ref([])
const stationIds = ref([])

function openCreate() {
  Object.assign(form, { id: undefined, code: '', name: '', dataScope: 'CUSTOM', remark: '' })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    code: row.code,
    name: row.name,
    dataScope: row.dataScope,
    remark: row.remark
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateRole(form.id, payload(form, ['name', 'dataScope', 'remark']))
    } else {
      await createRole(payload(form, ['code', 'name', 'dataScope', 'remark']))
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
  await deleteRole(row.id)
  ElMessage.success('已删除')
  await load()
}

function idsWithPerm(nodes, acc = new Set()) {
  nodes.forEach((node) => {
    if (node.perms) acc.add(node.id)
    if (node.children?.length) idsWithPerm(node.children, acc)
  })
  return acc
}

async function openMenus(row) {
  currentRole.value = row
  const [detail, tree] = await Promise.all([
    getRole(row.id),
    user.hasPerm('system:menu:list') ? menuTree() : Promise.resolve(user.info?.menus || [])
  ])
  menuNodes.value = trimTree(tree || [])
  menuVisible.value = true
  await nextTick()
  const allowed = idsWithPerm(menuNodes.value)
  menuTreeRef.value.setCheckedKeys((detail.menuIds || []).filter((id) => allowed.has(id)))
}

async function saveMenus() {
  const allowed = idsWithPerm(menuNodes.value)
  const picked = [...menuTreeRef.value.getCheckedKeys(), ...menuTreeRef.value.getHalfCheckedKeys()]
  menuSaving.value = true
  try {
    await assignRoleMenus(currentRole.value.id, picked.filter((id) => allowed.has(id)))
    ElMessage.success('菜单权限已更新')
    menuVisible.value = false
  } finally {
    menuSaving.value = false
  }
}

async function openStations(row) {
  currentRole.value = row
  const [detail, list] = await Promise.all([getRole(row.id), listAll(pageStations)])
  stations.value = list
  stationIds.value = detail.stationIds || []
  stationVisible.value = true
}

async function saveStations() {
  stationSaving.value = true
  try {
    await assignRoleStations(currentRole.value.id, stationIds.value)
    ElMessage.success('电站范围已更新')
    stationVisible.value = false
  } finally {
    stationSaving.value = false
  }
}

load()
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <el-input v-model="filters.name" clearable placeholder="角色名称" style="width: 220px" @keyup.enter="search" />
        <el-button type="primary" @click="search">查询</el-button>
        <span class="grow" />
        <el-button v-if="user.hasPerm('system:role:add')" type="primary" @click="openCreate">新建角色</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="code" label="编码" min-width="160" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="数据范围" width="120">
          <template #default="{ row }"><DictTag :value="row.dataScope" :map="dataScope" /></template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ row.builtIn === 1 ? '内置' : '自定义' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('system:role:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('system:role:edit')" link type="primary" @click="openMenus(row)">菜单</el-button>
            <el-button v-if="user.hasPerm('system:role:edit') && row.dataScope === 'CUSTOM'" link type="primary" @click="openStations(row)">电站</el-button>
            <el-button v-if="user.hasPerm('system:role:remove') && row.builtIn !== 1" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pager v-model:page-num="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="load" />
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑角色' : '新建角色'" width="520px">
      <el-form ref="formRef" :model="form" label-width="96px">
        <el-form-item v-if="!form.id" label="编码" prop="code" :rules="[{ required: true, pattern: /^[A-Z][A-Z0-9_]{1,31}$/, message: '大写字母开头，仅含大写字母、数字和下划线' }]">
          <el-input v-model="form.code" placeholder="不能使用系统保留编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入名称' }, { max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="数据范围" prop="dataScope" :rules="[{ required: true, message: '请选择数据范围' }]">
          <el-select v-model="form.dataScope">
            <el-option v-for="item in optionsOf(dataScope)" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark" :rules="[{ max: 255, message: '不超过 255 个字符' }]">
          <el-input v-model="form.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuVisible" title="分配菜单" width="480px">
      <p class="tip">勾选页面和按钮。目录会随已授权页面自动出现在侧边栏。</p>
      <el-tree
        ref="menuTreeRef"
        :data="menuNodes"
        node-key="id"
        show-checkbox
        check-strictly
        default-expand-all
        :props="{ label: 'name', children: 'children' }"
      />
      <template #footer>
        <el-button @click="menuVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuSaving" @click="saveMenus">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stationVisible" title="分配电站" width="520px">
      <el-select v-model="stationIds" multiple filterable style="width: 100%" placeholder="选择该角色可访问的电站">
        <el-option v-for="item in stations" :key="item.id" :label="`${item.name}（${item.code}）`" :value="item.id" />
      </el-select>
      <template #footer>
        <el-button @click="stationVisible = false">取消</el-button>
        <el-button type="primary" :loading="stationSaving" @click="saveStations">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tip {
  margin-top: 0;
  color: var(--ems-muted);
  font-size: 13px;
}
</style>
