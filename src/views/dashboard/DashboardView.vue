<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { flattenPages } from '@/utils/tree'

const router = useRouter()
const user = useUserStore()
const stations = computed(() => user.stations)
const links = computed(() => flattenPages(user.info?.menus || []).slice(0, 8))
</script>

<template>
  <div class="page">
    <section class="welcome">
      <div>
        <p>当前租户</p>
        <h2>{{ user.info?.tenantName || '能源云' }}</h2>
        <span>{{ user.nickname }} · {{ (user.info?.roles || []).join('、') || '未分配角色' }}</span>
      </div>
      <div class="stat">
        <strong>{{ stations.length }}</strong>
        <span>可见电站</span>
      </div>
    </section>

    <section class="panel">
      <div class="page-head">
        <div>
          <h2>电站</h2>
          <p>按当前角色的数据范围展示，全部电站角色会看到本租户电站。</p>
        </div>
      </div>
      <el-empty v-if="!stations.length" description="当前账号还没有可见电站" />
      <div v-else class="station-grid">
        <article v-for="station in stations" :key="station.id">
          <strong>{{ station.name }}</strong>
          <span>{{ station.code }}</span>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="page-head">
        <div>
          <h2>功能入口</h2>
          <p>只显示当前账号已授权的页面。</p>
        </div>
      </div>
      <div class="links">
        <el-button v-for="item in links" :key="item.id" @click="router.push(item.path)">
          {{ item.name }}
        </el-button>
        <el-empty v-if="!links.length" description="当前账号没有可访问的菜单" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 14px;
  color: #f8fafc;
  background: linear-gradient(120deg, #10243e, #0f766e);
}

.welcome p,
.welcome span,
.stat span {
  color: #d7efe9;
}

.welcome h2 {
  margin: 4px 0;
  font-size: 28px;
}

.stat {
  min-width: 120px;
  text-align: right;
}

.stat strong {
  display: block;
  font-size: 36px;
}

.station-grid,
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.station-grid article {
  min-width: 180px;
  padding: 12px 14px;
  border: 1px solid var(--ems-line);
  border-radius: 10px;
  background: #f8fbfb;
}

.station-grid strong,
.station-grid span {
  display: block;
}

.station-grid span {
  margin-top: 4px;
  color: var(--ems-muted);
  font-size: 12px;
}
</style>
