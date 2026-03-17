import { useCallback, useEffect, useState } from 'react'
import { getBranches, getFormCategories } from '../api/options'
import type { Branch, FormCategoryOption } from '../api/options'

export function useFormOptions() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<FormCategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [branchesRes, categoriesRes] = await Promise.all([
        getBranches(),
        getFormCategories(),
      ])
      setBranches(branchesRes)
      setCategories(categoriesRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load options')
      setBranches([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { branches, categories, loading, error, reload: load }
}
