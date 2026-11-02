import { ElMessage } from 'element-plus'
import http from './http'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function listStationImages(stationId) {
  return http.get(`/api/v1/stations/${stationId}/images`)
}

export function deleteStationImage(stationId, imageId) {
  return http.delete(`/api/v1/stations/${stationId}/images/${imageId}`)
}

export function setStationCover(stationId, imageId) {
  return http.put(`/api/v1/stations/${stationId}/images/${imageId}/cover`)
}

export function deleteAvatar() {
  return http.delete('/api/v1/users/me/avatar')
}

export async function uploadImage({ bizType, bizId, file, maxBytes }) {
  const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  if (!ALLOWED.has(contentType)) {
    ElMessage.error('只支持 jpg、png、webp')
    throw new Error('不支持的图片类型')
  }
  if (file.size > maxBytes) {
    ElMessage.error(`文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
    throw new Error('文件过大')
  }
  const ticket = await http.post('/api/v1/files/upload-tickets', {
    bizType,
    bizId,
    contentType,
    fileSize: file.size
  })
  let uploaded
  try {
    uploaded = await fetch(ticket.uploadUrl, {
      method: ticket.method || 'PUT',
      headers: { 'Content-Type': ticket.contentType },
      body: file
    })
  } catch {
    ElMessage.error('上传到对象存储失败，请检查网络或 OSS 跨域配置')
    throw new Error('上传失败')
  }
  if (!uploaded.ok) {
    ElMessage.error('上传到对象存储失败')
    throw new Error('上传失败')
  }
  await http.post(`/api/v1/files/upload-tickets/${ticket.ticketId}/confirm`)
}
