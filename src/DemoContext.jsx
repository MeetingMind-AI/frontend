import { createContext, useContext, useState } from 'react'

const DemoContext = createContext({ demo: false, toggle: () => {} })

export function DemoProvider({ children }) {
  const [demo, setDemo] = useState(() => localStorage.getItem('demoMode') === 'true')

  const toggle = () =>
    setDemo((prev) => {
      const next = !prev
      localStorage.setItem('demoMode', String(next))
      return next
    })

  return <DemoContext.Provider value={{ demo, toggle }}>{children}</DemoContext.Provider>
}

export function useDemoMode() {
  return useContext(DemoContext)
}
