import { ElMessageBox } from 'element-plus'

export function confirmRemove(name) {
  return ElMessageBox.confirm(`确认删除「${name}」？删除后不可恢复。`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger'
  })
}

export function payload(source, keys) {
  const body = {}
  keys.forEach((key) => {
    const value = source[key]
    if (value === '' || value === undefined) return
    body[key] = value
  })
  return body
}
