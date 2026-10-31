<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import DictTag from '@/components/DictTag.vue'
import { createMenu, deleteMenu, menuTree, updateMenu } from '@/api/system'
import { useUserStore } from '@/stores/user'
import { menuType, optionsOf } from '@/utils/dict'
import { confirmRemove, payload } from '@/utils/feedback'
import { trimTree } from '@/utils/tree'

const user = useUserStore()
const loading = ref(false)
const tree = ref([])
const visible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({})

const parentOptions = computed(() => {
  const blocked = new Set()
  if (form.id) {
    const current = findNode(tree.value, form.id)
    if (current) collectIds(current, blocked)
  }
  return flatten(tree.value, 0, blocked)
})

async function load() {
  loading.value = true
  try {
    tree.value = trimTree(await menuTree())
  } finally {
    loading.value = false
  }
}

function openCreate(parentId = 0) {
  Object.assign(form, {
    id: undefined,
    parentId,
    name: '',
    menuType: parentId ? 'C' : 'M',
    path: '',
    perms: '',
    sortNum: 1,
    visible: 1
  })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    parentId: row.parentId || 0,
    name: row.name,
    menuType: row.menuType,
    path: row.path,
    perms: row.perms,
    sortNum: row.sortNum ?? 1,
    visible: 1
  })
  visible.value = true
}

async function submit() {
  await formRef.value.validate()
  const body = payload(form, ['parentId', 'name', 'menuType', 'path', 'perms', 'sortNum', 'visible'])
  if (body.menuType === 'F') delete body.path
  saving.value = true
  try {
    if (form.id) await updateMenu(form.id, body)
    else await createMenu(body)
    ElMessage.success('已保存')
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await confirmRemove(row.name)
  await deleteMenu(row.id)
  ElMessage.success('已删除')
  await load()
}

function flatten(nodes, depth, blocked, acc = []) {
  nodes.forEach((node) => {
    acc.push({
      id: node.id,
      label: `${depth ? '└ ' : ''}${'　'.repeat(depth)}${node.name}`,
      disabled: blocked.has(node.id)
    })
    if (node.children?.length) flatten(node.children, depth + 1, blocked, acc)
  })
  return acc
}

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = node.children ? findNode(node.children, id) : null
    if (found) return found
  }
  return null
}

function collectIds(node, acc) {
  acc.add(node.id)
  ;(node.children || []).forEach((child) => collectIds(child, acc))
}

load()
</script>

<template>
  <div class="page">
    <section class="panel">
      <div class="toolbar">
        <span class="grow" />
        <el-button v-if="user.hasPerm('system:menu:add')" type="primary" @click="openCreate(0)">新建菜单</el-button>
      </div>
      <el-table v-loading="loading" :data="tree" row-key="id" border default-expand-all>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }"><DictTag :value="row.menuType" :map="menuType" /></template>
        </el-table-column>
        <el-table-column prop="path" label="路径" min-width="160" />
        <el-table-column prop="perms" label="权限标识" min-width="180" />
        <el-table-column prop="sortNum" label="排序" width="80" />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button v-if="user.hasPerm('system:menu:add') && row.menuType !== 'F'" link type="primary" @click="openCreate(row.id)">新增下级</el-button>
            <el-button v-if="user.hasPerm('system:menu:edit')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="user.hasPerm('system:menu:remove')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="visible" :title="form.id ? '编辑菜单' : '新建菜单'" width="560px">
      <el-form ref="formRef" :model="form" label-width="96px">
        <el-form-item label="上级" prop="parentId" :rules="[{ required: true, message: '请选择上级' }]">
          <el-select v-model="form.parentId" style="width: 100%">
            <el-option :value="0" label="顶级" />
            <el-option v-for="item in parentOptions" :key="item.id" :label="item.label" :value="item.id" :disabled="item.disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入名称' }, { max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类型" prop="menuType" :rules="[{ required: true, message: '请选择类型' }]">
          <el-radio-group v-model="form.menuType">
            <el-radio v-for="item in optionsOf(menuType)" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.menuType !== 'F'"
          label="路径"
          prop="path"
          :rules="[{ required: true, message: '请输入路径' }, { max: 128, message: '不超过 128 个字符' }]"
        >
          <el-input v-model="form.path" placeholder="/system/user" />
        </el-form-item>
        <el-form-item label="权限标识" prop="perms" :rules="[{ max: 64, message: '不超过 64 个字符' }]">
          <el-input v-model="form.perms" placeholder="system:user:list" />
        </el-form-item>
        <el-form-item label="排序" prop="sortNum" :rules="[{ required: true, message: '请输入排序' }]">
          <el-input-number v-model="form.sortNum" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="显示">
          <el-switch v-model="form.visible" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
