export function queryOf(source) {
  const params = {}
  Object.entries(source).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return
    params[key] = value
  })
  return params
}

export function navTree(menus) {
  return (menus || [])
    .filter((item) => item.menuType === 'M' || item.menuType === 'C')
    .map((item) => {
      const children = navTree(item.children)
      return { ...item, children }
    })
    .filter((item) => item.menuType === 'C' || item.children.length > 0)
}

export function trimTree(nodes) {
  return (nodes || []).map((node) => {
    const children = trimTree(node.children)
    if (!children.length) {
      const copy = { ...node }
      delete copy.children
      return copy
    }
    return { ...node, children }
  })
}

export function flattenPages(menus, acc = []) {
  ;(menus || []).forEach((node) => {
    if (node.menuType === 'C' && node.path) acc.push(node)
    if (node.children?.length) flattenPages(node.children, acc)
  })
  return acc
}

export async function listAll(fetcher, extra = {}) {
  const pageSize = 100
  let pageNum = 1
  let rows = []
  let total = 0
  do {
    const data = await fetcher({ ...extra, pageNum, pageSize })
    const batch = data?.rows || []
    total = Number(data?.total || 0)
    rows = rows.concat(batch)
    pageNum += 1
    if (!batch.length) break
  } while (rows.length < total && pageNum <= 20)
  return rows
}
