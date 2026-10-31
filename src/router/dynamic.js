const names = []

export function installMenus(router, menus, pageMap) {
  resetDynamicRoutes(router)
  const pages = []
  collect(menus, pages, pageMap)
  pages.forEach((page) => {
    const name = `page:${page.path}`
    router.addRoute('layout', {
      path: page.path.replace(/^\//, ''),
      name,
      component: pageMap[page.path],
      meta: { title: page.name, perm: page.perms }
    })
    names.push(name)
  })
  const fallback = 'page:not-found'
  router.addRoute('layout', {
    path: ':pathMatch(.*)*',
    name: fallback,
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  })
  names.push(fallback)
}

export function resetDynamicRoutes(router) {
  while (names.length) {
    const name = names.pop()
    if (router.hasRoute(name)) router.removeRoute(name)
  }
}

function collect(menus, acc, pageMap) {
  ;(menus || []).forEach((node) => {
    if (node.menuType === 'C' && node.path && pageMap[node.path]) acc.push(node)
    if (node.children?.length) collect(node.children, acc, pageMap)
  })
}
