import http from './http'
import { queryOf } from '@/utils/tree'

export function pageStations(query) {
  return http.get('/api/v1/stations', { params: queryOf(query) })
}

export function getStation(id) {
  return http.get(`/api/v1/stations/${id}`)
}

export function createStation(data) {
  return http.post('/api/v1/stations', data)
}

export function updateStation(id, data) {
  return http.put(`/api/v1/stations/${id}`, data)
}

export function deleteStation(id) {
  return http.delete(`/api/v1/stations/${id}`)
}

export function pageGateways(query) {
  return http.get('/api/v1/gateways', { params: queryOf(query) })
}

export function createGateway(data) {
  return http.post('/api/v1/gateways', data)
}

export function updateGateway(id, data) {
  return http.put(`/api/v1/gateways/${id}`, data)
}

export function deleteGateway(id) {
  return http.delete(`/api/v1/gateways/${id}`)
}

export function pageDevices(query) {
  return http.get('/api/v1/devices', { params: queryOf(query) })
}

export function createDevice(data) {
  return http.post('/api/v1/devices', data)
}

export function updateDevice(id, data) {
  return http.put(`/api/v1/devices/${id}`, data)
}

export function deleteDevice(id) {
  return http.delete(`/api/v1/devices/${id}`)
}

export function bindDeviceProduct(id, productId) {
  return http.put(`/api/v1/devices/${id}/product`, { productId })
}
