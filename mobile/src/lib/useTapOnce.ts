import { useCallback, useRef, useState } from 'react'
import { Keyboard } from 'react-native'
import { useFocusEffect, useNavigation } from 'expo-router'

// One frame: long enough for the "working" look to reach the screen before the work starts.
const SHOW_FIRST_MS = 16
// After the work is done: if the page is still the one on screen, taps count again.
const STILL_HERE_MS = 500

// For buttons that move to another page. Building the next page keeps the app busy for a moment,
// and during that moment nothing on screen used to change, so customers tapped again and again.
// With this, a tap first shows that it was received (`busy` holds the key of the tapped button, for
// a spinner), the work starts one frame later, and further taps are ignored until the page has
// changed. Coming back to the page, or work that ends without leaving it (an error message, for
// example), makes the buttons usable again.
export function useTapOnce() {
  const navigation = useNavigation()
  const [busy, setBusy] = useState<string | null>(null)
  const locked = useRef(false)
  const onScreen = useRef(true)

  useFocusEffect(
    useCallback(() => {
      onScreen.current = true
      locked.current = false
      setBusy(null)
      return () => {
        onScreen.current = false
      }
    }, []),
  )

  const run = useCallback(
    (key: string, action?: () => unknown) => {
      if (locked.current || !action) return
      locked.current = true
      setBusy(key)
      Keyboard.dismiss()
      setTimeout(async () => {
        try {
          await action()
        } finally {
          setTimeout(() => {
            // The page was left: it stays locked until it is shown again (see above).
            if (!onScreen.current || !navigation.isFocused()) return
            locked.current = false
            setBusy(null)
          }, STILL_HERE_MS)
        }
      }, SHOW_FIRST_MS)
    },
    [navigation],
  )

  return { busy, run }
}
