<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MenuBranch from '@/components/MenuBranch.vue'
import { changePassword } from '@/api/system'
import { useUserStore } from '@/stores/user'
import { navTree } from '@/utils/tree'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const collapsed = ref(false)
const passwordVisible = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })

const menus = computed(() => navTree(user.info?.menus || []))
const title = computed(() => route.meta.title || '能源云')

function logout() {
  user.reset(router)
  router.replace('/login')
}

function openPassword() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirm = ''
  passwordVisible.value = true
}

async function submitPassword() {
  await formRef.value.validate()
  saving.value = true
  try {
    await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    ElMessage.success('密码已更新，请重新登录')
    passwordVisible.value = false
    logout()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="shell">
    <aside class="sider" :class="{ collapsed }">
      <div class="brand">
        <span class="mark">E</span>
        <div v-show="!collapsed">
          <strong>能源云</strong>
          <small>电站与物模型</small>
        </div>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="collapsed"
        router
        background-color="#10243e"
        text-color="#c9d4e0"
        active-text-color="#5eead4"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <MenuBranch :items="menus" />
      </el-menu>
    </aside>
    <section class="main">
      <header class="top">
        <div class="top-left">
          <el-button text @click="collapsed = !collapsed">
            <el-icon :size="18"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
          <span class="crumb">{{ title }}</span>
        </div>
        <el-dropdown trigger="click">
          <span class="user">
            <el-avatar :size="28">{{ user.nickname.slice(0, 1) || '用' }}</el-avatar>
            <span>
              <b>{{ user.nickname || '用户' }}</b>
              <small>{{ user.info?.tenantName || '—' }}</small>
            </span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openPassword">修改密码</el-dropdown-item>
              <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>
      <main class="content">
        <router-view />
      </main>
    </section>

    <el-dialog v-model="passwordVisible" title="修改密码" width="420px">
      <el-form ref="formRef" :model="form" label-width="88px">
        <el-form-item label="原密码" prop="oldPassword" :rules="[{ required: true, message: '请输入原密码' }]">
          <el-input v-model="form.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item
          label="新密码"
          prop="newPassword"
          :rules="[{ required: true, min: 6, max: 64, message: '密码长度为 6 到 64 位' }]"
        >
          <el-input v-model="form.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item
          label="确认密码"
          prop="confirm"
          :rules="[{
            validator: (_r, value, callback) => value === form.newPassword ? callback() : callback(new Error('两次密码不一致')),
            trigger: 'blur'
          }]"
        >
          <el-input v-model="form.confirm" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitPassword">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  min-height: 100%;
}

.sider {
  width: 220px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: #10243e;
  color: #fff;
  transition: width 0.2s ease;
}

.sider.collapsed {
  width: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand strong,
.brand small {
  display: block;
}

.brand small {
  color: #8ea0b5;
  font-size: 12px;
}

.mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #0f766e;
  font-weight: 700;
}

.sider :deep(.el-menu) {
  border-right: none;
  flex: 1;
  overflow: auto;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.top {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--ems-line);
}

.top-left,
.user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user {
  cursor: pointer;
}

.user b,
.user small {
  display: block;
  line-height: 1.2;
}

.user small {
  color: var(--ems-muted);
  font-size: 12px;
}

.crumb {
  font-weight: 600;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
