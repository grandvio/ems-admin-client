import { reactive, ref } from 'vue'

export function useTable(fetcher) {
  const loading = ref(false)
  const rows = ref([])
  const total = ref(0)
  const query = reactive({ pageNum: 1, pageSize: 10 })
  let ticket = 0

  async function load() {
    const current = ++ticket
    loading.value = true
    try {
      const data = await fetcher({ ...query })
      if (current !== ticket) return
      rows.value = data?.rows || []
      total.value = Number(data?.total || 0)
    } finally {
      if (current === ticket) loading.value = false
    }
  }

  function search() {
    query.pageNum = 1
    return load()
  }

  return { loading, rows, total, query, load, search }
}

export function openCreate(form, blank) {
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, blank())
}

export function openEdit(form, row, fields) {
  Object.keys(form).forEach((key) => delete form[key])
  const next = { id: row.id }
  fields.forEach((field) => {
    next[field] = row[field] ?? null
  })
  Object.assign(form, next)
}
