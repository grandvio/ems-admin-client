export const userStatus = {
  ENABLED: { label: '启用', type: 'success' },
  DISABLED: { label: '停用', type: 'info' }
}

export const stationType = {
  STORAGE: { label: '储能', type: 'warning' },
  PV_STORAGE: { label: '光储', type: 'success' },
  PV_STORAGE_CHARGE: { label: '光储充', type: 'primary' }
}

export const stationStatus = {
  BUILDING: { label: '建设中', type: 'warning' },
  RUNNING: { label: '运行', type: 'success' },
  STOPPED: { label: '停运', type: 'info' }
}

export const onlineStatus = {
  ONLINE: { label: '在线', type: 'success' },
  OFFLINE: { label: '离线', type: 'info' }
}

export const deviceStatus = {
  INACTIVE: { label: '未激活', type: 'info' },
  ONLINE: { label: '在线', type: 'success' },
  OFFLINE: { label: '离线', type: 'warning' },
  ALARM: { label: '告警', type: 'danger' }
}

export const productStatus = {
  DRAFT: { label: '草稿', type: 'info' },
  PUBLISHED: { label: '已发布', type: 'success' }
}

export const dataType = {
  float: { label: '浮点' },
  int: { label: '整数' },
  bool: { label: '布尔' },
  string: { label: '字符串' }
}

export const accessMode = {
  r: { label: '只读', type: 'info' },
  rw: { label: '读写', type: 'success' }
}

export const groupCode = {
  TELEMETRY: { label: '遥测', type: '' },
  STATUS: { label: '状态', type: 'success' },
  SETPOINT: { label: '设定', type: 'warning' }
}

export const eventLevel = {
  INFO: { label: '信息', type: 'info' },
  WARN: { label: '警告', type: 'warning' },
  CRITICAL: { label: '严重', type: 'danger' }
}

export const dataScope = {
  ALL: { label: '全部电站', type: 'success' },
  CUSTOM: { label: '指定电站', type: 'warning' }
}

export const menuType = {
  M: { label: '目录', type: '' },
  C: { label: '页面', type: 'success' },
  F: { label: '按钮', type: 'info' }
}

export function optionsOf(map) {
  return Object.entries(map).map(([value, item]) => ({ value, label: item.label }))
}

export function labelOf(map, value) {
  return map[value]?.label || value || '—'
}
