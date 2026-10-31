import { defineStore } from 'pinia'
import { fetchInfo, login as loginApi } from '@/api/system'
import { clearToken, getToken, setToken } from '@/utils/auth'
import { resetDynamicRoutes } from '@/router/dynamic'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    info: null,
    loaded: false
  }),
  getters: {
    permissions: (state) => state.info?.permissions || [],
    stations: (state) => state.info?.stations || [],
    nickname: (state) => state.info?.nickname || state.info?.username || ''
  },
  actions: {
    hasPerm(code) {
      if (!code) return true
      return this.permissions.includes(code)
    },
    async login(form) {
      const data = await loginApi({
        username: form.username,
        password: form.password,
        client: 'web'
      })
      setToken(data.token)
      this.token = data.token
      this.info = null
      this.loaded = false
    },
    async loadInfo() {
      this.info = await fetchInfo()
      this.loaded = true
      return this.info
    },
    reset(router) {
      clearToken()
      this.token = ''
      this.info = null
      this.loaded = false
      if (router) resetDynamicRoutes(router)
    }
  }
})
