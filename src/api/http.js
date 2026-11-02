import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken } from '@/utils/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 20000
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') return response
    const body = response.data
    if (body && typeof body.code === 'number' && body.code !== 200) {
      ElMessage.error(body.msg || '请求失败')
      return Promise.reject(new Error(body.msg || '请求失败'))
    }
    return body?.data
  },
  async (error) => {
    let payload = error.response?.data
    if (payload instanceof Blob) {
      try {
        payload = JSON.parse(await payload.text())
      } catch {
        payload = null
      }
    }
    const status = error.response?.status
    const msg = payload?.msg || error.message || '网络异常'
    if (status === 401) {
      await forceLogout()
    }
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

async function forceLogout() {
  const [{ useUserStore }, { default: router }] = await Promise.all([
    import('@/stores/user'),
    import('@/router')
  ])
  useUserStore().reset(router)
  if (router.currentRoute.value.path !== '/login') {
    router.replace('/login')
  }
}

export default http
