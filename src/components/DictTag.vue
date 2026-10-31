<script setup>
defineProps({
  value: { type: [String, Number], default: '' },
  map: { type: Object, required: true }
})
</script>

<template>
  <el-tag v-if="value && map[value]" :type="map[value].type || 'info'" effect="light">
    {{ map[value].label }}
  </el-tag>
  <span v-else>{{ value || '—' }}</span>
</template>
