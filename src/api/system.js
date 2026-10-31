import http from './http'
import { queryOf } from '@/utils/tree'

export function login(data) {
  return http.post('/api/v1/auth/login', data)
}

export function fetchInfo() {
  return http.get('/api/v1/auth/info')
}

export function changePassword(data) {
  return http.put('/api/v1/auth/password', data)
}

export function pageTenants(query) {
  return http.get('/api/v1/system/tenants', { params: queryOf(query) })
}

export function createTenant(data) {
  return http.post('/api/v1/system/tenants', data)
}

export function updateTenant(id, data) {
  return http.put(`/api/v1/system/tenants/${id}`, data)
}

export function deleteTenant(id) {
  return http.delete(`/api/v1/system/tenants/${id}`)
}

export function pageUsers(query) {
  return http.get('/api/v1/system/users', { params: queryOf(query) })
}

export function getUser(id) {
  return http.get(`/api/v1/system/users/${id}`)
}

export function createUser(data) {
  return http.post('/api/v1/system/users', data)
}

export function updateUser(id, data) {
  return http.put(`/api/v1/system/users/${id}`, data)
}

export function deleteUser(id) {
  return http.delete(`/api/v1/system/users/${id}`)
}

export function pageRoles(query) {
  return http.get('/api/v1/system/roles', { params: queryOf(query) })
}

export function getRole(id) {
  return http.get(`/api/v1/system/roles/${id}`)
}

export function createRole(data) {
  return http.post('/api/v1/system/roles', data)
}

export function updateRole(id, data) {
  return http.put(`/api/v1/system/roles/${id}`, data)
}

export function deleteRole(id) {
  return http.delete(`/api/v1/system/roles/${id}`)
}

export function assignRoleMenus(id, menuIds) {
  return http.put(`/api/v1/system/roles/${id}/menus`, { menuIds })
}

export function assignRoleStations(id, stationIds) {
  return http.put(`/api/v1/system/roles/${id}/stations`, { stationIds })
}

export function menuTree() {
  return http.get('/api/v1/system/menus')
}

export function createMenu(data) {
  return http.post('/api/v1/system/menus', data)
}

export function updateMenu(id, data) {
  return http.put(`/api/v1/system/menus/${id}`, data)
}

export function deleteMenu(id) {
  return http.delete(`/api/v1/system/menus/${id}`)
}
