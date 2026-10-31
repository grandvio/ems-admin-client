<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const user = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    await user.login(form)
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="hero">
      <div class="grid" />
      <div class="hero-copy">
        <p class="eyebrow">EMS ADMIN</p>
        <h1>能源云管理平台</h1>
        <p>面向多租户的电站、网关、设备与物模型管理。菜单和按钮权限由服务端角色下发。</p>
      </div>
    </section>
    <section class="panel-wrap">
      <el-form ref="formRef" class="card" :model="form" size="large" @keyup.enter="submit">
        <h2>登录</h2>
        <p>使用 ems-admin-service 账号进入控制台</p>
        <el-form-item prop="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <el-input v-model="form.username" placeholder="用户名" maxlength="32" />
        </el-form-item>
        <el-form-item prop="password" :rules="[{ required: true, min: 6, message: '密码至少 6 位' }]">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" maxlength="64" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">进入控制台</el-button>
        <p class="hint">首次初始化的平台账号为 admin / admin123，登录后请立即修改密码。</p>
      </el-form>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  min-height: 100%;
  background: #f7f5f0;
}

.hero {
  position: relative;
  overflow: hidden;
  color: #f8fafc;
  background:
    radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.35), transparent 32%),
    linear-gradient(160deg, #0b1c30 0%, #12344f 55%, #0f766e 140%);
  display: flex;
  align-items: flex-end;
  padding: 64px;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, #000 20%, transparent 95%);
}

.hero-copy {
  position: relative;
  max-width: 520px;
}

.eyebrow {
  letter-spacing: 0.18em;
  color: #99f6e4;
  font-size: 13px;
}

h1 {
  margin: 8px 0 12px;
  font-size: 46px;
  line-height: 1.15;
}

.hero-copy p:last-child {
  margin: 0;
  color: #d5e2ee;
  font-size: 16px;
  line-height: 1.7;
}

.panel-wrap {
  display: grid;
  place-items: center;
  padding: 32px;
}

.card {
  width: min(400px, 100%);
}

.card h2 {
  margin: 0 0 6px;
  font-size: 28px;
}

.card > p {
  margin: 0 0 24px;
  color: var(--ems-muted);
}

.submit {
  width: 100%;
}

.hint {
  margin: 14px 0 0;
  color: var(--ems-muted);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
  }

  .hero {
    min-height: 240px;
    padding: 32px;
  }

  h1 {
    font-size: 32px;
  }
}
</style>
