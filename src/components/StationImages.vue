<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { deleteStationImage, listStationImages, setStationCover, uploadImage } from '@/api/oss'
import { confirmRemove } from '@/utils/feedback'

const props = defineProps({
  stationId: { type: Number, required: true }
})
const emit = defineEmits(['change'])

const MAX = 9
const images = ref([])
const uploading = ref(false)
const fileRef = ref()

async function load() {
  images.value = await listStationImages(props.stationId)
}

watch(() => props.stationId, () => load(), { immediate: true })

function pick() {
  fileRef.value.value = ''
  fileRef.value.click()
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    await uploadImage({ bizType: 'STATION', bizId: props.stationId, file, maxBytes: 5 * 1024 * 1024 })
    ElMessage.success('已上传')
    await load()
    emit('change')
  } catch {
    // 失败原因已由请求或上传函数提示
  } finally {
    uploading.value = false
  }
}

async function cover(image) {
  await setStationCover(props.stationId, image.id)
  ElMessage.success('已设为封面')
  await load()
  emit('change')
}

async function remove(image) {
  await confirmRemove('这张电站图片')
  await deleteStationImage(props.stationId, image.id)
  ElMessage.success('已删除')
  await load()
  emit('change')
}
</script>

<template>
  <div class="gallery">
    <figure v-for="image in images" :key="image.id">
      <img :src="image.url" alt="电站图片" />
      <figcaption>
        <el-tag v-if="image.cover === 1" size="small" type="success">封面</el-tag>
        <el-button v-else link type="primary" @click="cover(image)">设为封面</el-button>
        <el-button link type="danger" @click="remove(image)">删除</el-button>
      </figcaption>
    </figure>
    <button v-if="images.length < MAX" class="add" type="button" :disabled="uploading" @click="pick">
      {{ uploading ? '上传中' : '上传图片' }}
    </button>
    <input ref="fileRef" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onFile" />
  </div>
  <p class="hint">最多 {{ MAX }} 张，单张不超过 5MB，支持 jpg、png、webp。第一张会自动成为封面。</p>
</template>

<style scoped>
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

figure {
  width: 120px;
  margin: 0;
}

img {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--ems-line);
  background: #f8fafc;
}

figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.add {
  width: 120px;
  height: 80px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: var(--ems-muted);
  cursor: pointer;
}

.add:disabled {
  cursor: wait;
}

.hint {
  margin: 8px 0 0;
  color: var(--ems-muted);
  font-size: 12px;
  line-height: 1.5;
}
</style>
