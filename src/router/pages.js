export const pageMap = {
  '/system/tenant': () => import('@/views/system/TenantView.vue'),
  '/system/user': () => import('@/views/system/UserView.vue'),
  '/system/role': () => import('@/views/system/RoleView.vue'),
  '/system/menu': () => import('@/views/system/MenuView.vue'),
  '/station/station': () => import('@/views/station/StationView.vue'),
  '/station/gateway': () => import('@/views/station/GatewayView.vue'),
  '/station/device': () => import('@/views/station/DeviceView.vue'),
  '/thing/product': () => import('@/views/thing/ProductView.vue'),
  '/thing/property': () => import('@/views/thing/PropertyView.vue'),
  '/thing/event': () => import('@/views/thing/EventView.vue'),
  '/thing/service': () => import('@/views/thing/ServiceView.vue'),
  '/data/metric': () => import('@/views/data/MetricView.vue'),
  '/data/station': () => import('@/views/data/StationMonitorView.vue')
}
