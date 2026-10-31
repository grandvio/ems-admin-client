<script setup>
const pageNum = defineModel('pageNum', { type: Number, required: true })
const pageSize = defineModel('pageSize', { type: Number, required: true })
defineProps({
  total: { type: Number, default: 0 }
})
const emit = defineEmits(['change'])

function changePage(value) {
  pageNum.value = value
  emit('change')
}

function changeSize(value) {
  pageSize.value = value
  if (pageNum.value !== 1) pageNum.value = 1
  emit('change')
}
</script>

<template>
  <div class="pager">
    <el-pagination
      background
      :current-page="pageNum"
      :page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @current-change="changePage"
      @size-change="changeSize"
    />
  </div>
</template>
