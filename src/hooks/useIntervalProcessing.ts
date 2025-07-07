import { useRef, useEffect } from 'react'

export function useIntervalProcessing(
  callback: () => void,
  intervalMs: number,
  isActive: boolean
) {
  const intervalIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive) {
      callback() // Run immediately on start
      intervalIdRef.current = window.setInterval(callback, intervalMs)
    } else if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, intervalMs])

  // Manual trigger
  function trigger() {
    callback()
  }

  return { trigger }
}
