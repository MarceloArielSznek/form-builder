import { useCallback, useEffect, useState } from 'react'
import { getBranches, getFormCategories, getOrganizations } from '../api/options'
import type { Branch, FormCategoryOption, Organization } from '../api/options'

export function useFormOptions() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<FormCategoryOption[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [branchesRes, categoriesRes, organizationsRes] = await Promise.all([
        getBranches(),
        getFormCategories(),
        getOrganizations(),
      ])
      setBranches(branchesRes)
      setCategories(categoriesRes)
      setOrganizations(organizationsRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load options')
      setBranches([])
      setCategories([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { branches, categories, organizations, loading, error, reload: load }
}
