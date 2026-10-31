import http from './http'
import { queryOf } from '@/utils/tree'

export function pageProducts(query) {
  return http.get('/api/v1/products', { params: queryOf(query) })
}

export function createProduct(data) {
  return http.post('/api/v1/products', data)
}

export function updateProduct(id, data) {
  return http.put(`/api/v1/products/${id}`, data)
}

export function deleteProduct(id) {
  return http.delete(`/api/v1/products/${id}`)
}

export function publishProduct(id) {
  return http.post(`/api/v1/products/${id}/publish`)
}

export function listProperties(productId) {
  return http.get(`/api/v1/products/${productId}/properties`)
}

export function createProperty(productId, data) {
  return http.post(`/api/v1/products/${productId}/properties`, data)
}

export function updateProperty(productId, id, data) {
  return http.put(`/api/v1/products/${productId}/properties/${id}`, data)
}

export function deleteProperty(productId, id) {
  return http.delete(`/api/v1/products/${productId}/properties/${id}`)
}

export function listEvents(productId) {
  return http.get(`/api/v1/products/${productId}/events`)
}

export function createEvent(productId, data) {
  return http.post(`/api/v1/products/${productId}/events`, data)
}

export function updateEvent(productId, id, data) {
  return http.put(`/api/v1/products/${productId}/events/${id}`, data)
}

export function deleteEvent(productId, id) {
  return http.delete(`/api/v1/products/${productId}/events/${id}`)
}

export function listServices(productId) {
  return http.get(`/api/v1/products/${productId}/services`)
}

export function createService(productId, data) {
  return http.post(`/api/v1/products/${productId}/services`, data)
}

export function updateService(productId, id, data) {
  return http.put(`/api/v1/products/${productId}/services/${id}`, data)
}

export function deleteService(productId, id) {
  return http.delete(`/api/v1/products/${productId}/services/${id}`)
}

export function latestMetrics(deviceId, identifiers) {
  return http.get(`/api/v1/devices/${deviceId}/metrics/latest`, {
    params: queryOf({ identifiers })
  })
}

export function historyMetrics(deviceId, params) {
  return http.get(`/api/v1/devices/${deviceId}/metrics/history`, { params })
}
