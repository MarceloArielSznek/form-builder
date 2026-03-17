import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface UnsavedChangesContextValue {
  isDirty: boolean
  setDirty: (dirty: boolean) => void
  confirmNavigation: (message?: string) => boolean
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

interface UnsavedChangesProviderProps {
  children: ReactNode
}

export function UnsavedChangesProvider({ children }: UnsavedChangesProviderProps) {
  const [isDirty, setDirty] = useState(false)

  const confirmNavigation = useCallback(
    (message = 'You have unsaved changes. Leave this page anyway?') => {
      if (!isDirty) {
        return true
      }

      return window.confirm(message)
    },
    [isDirty],
  )

  const value = useMemo(
    () => ({
      isDirty,
      setDirty,
      confirmNavigation,
    }),
    [confirmNavigation, isDirty],
  )

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)

  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  }

  return context
}
