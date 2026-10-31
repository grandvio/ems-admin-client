<script setup>
defineOptions({ name: 'MenuBranch' })
defineProps({
  items: { type: Array, default: () => [] }
})

const icons = {
  '/system': 'Setting',
  '/station': 'OfficeBuilding',
  '/thing': 'Cpu',
  '/data/station': 'Monitor',
  '/data/metric': 'DataLine',
  '/data': 'DataLine'
}

function iconOf(path) {
  if (!path) return 'Menu'
  if (icons[path]) return icons[path]
  const key = Object.keys(icons).find((item) => path === item || path.startsWith(`${item}/`))
  return icons[key] || 'Menu'
}
</script>

<template>
  <template v-for="item in items" :key="item.id">
    <el-sub-menu v-if="item.children?.length" :index="String(item.id)">
      <template #title>
        <el-icon><component :is="iconOf(item.path)" /></el-icon>
        <span>{{ item.name }}</span>
      </template>
      <MenuBranch :items="item.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="item.path">
      <el-icon><component :is="iconOf(item.path)" /></el-icon>
      <span>{{ item.name }}</span>
    </el-menu-item>
  </template>
</template>
