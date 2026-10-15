import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Dimensions, Keyboard, ScrollView, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

// Under Android's edge-to-edge window (and in immersive/kiosk mode) the system no longer resizes
// the window for the keyboard, so the keyboard simply covers whatever is low on the screen. This
// frame measures how much of itself the keyboard overlaps, lifts the footer (Back/Continue) above
// it, and scrolls the focused field into the part of the scroll area that stays visible.
const EnsureVisibleContext = createContext<() => void>(() => {})
export const useEnsureVisible = () => useContext(EnsureVisibleContext)

type Props = ScrollViewProps & {
  footer?: ReactNode
  topEdge?: boolean
  children: ReactNode
}

const FIELD_MARGIN = 24
const LABEL_ALLOWANCE = 32

export function KeyboardAwareScreen({ footer, topEdge = true, children, onScroll, ...scrollProps }: Props) {
  const insets = useSafeAreaInsets()
  const rootRef = useRef<View>(null)
  const scrollRef = useRef<ScrollView>(null)
  const scrollBoxRef = useRef<View>(null)
  const scrollY = useRef(0)
  const [overlap, setOverlap] = useState(0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const ensureVisible = useCallback(() => {
    setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput?.()
      const scroll = scrollRef.current
      const box = scrollBoxRef.current
      if (!input || !scroll || !box) return
      box.measureInWindow((_sx, sy, _sw, sh) => {
        input.measureInWindow((_ix, iy, _iw, ih) => {
          const visibleTop = sy
          const visibleBottom = sy + sh
          let delta = 0
          if (iy + ih + FIELD_MARGIN > visibleBottom) delta = iy + ih + FIELD_MARGIN - visibleBottom
          else if (iy - LABEL_ALLOWANCE < visibleTop) delta = iy - LABEL_ALLOWANCE - visibleTop
          if (delta !== 0) scroll.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true })
        })
      })
    }, 160)
  }, [])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      rootRef.current?.measureInWindow((_x, y, _w, h) => {
        const rootBottom = y + h
        const windowHeight = Dimensions.get('window').height
        const measured = Math.max(0, rootBottom - e.endCoordinates.screenY)
        // If the window already shrank for the keyboard the measured overlap is 0; if the root still
        // reaches the bottom of the window but the keyboard position looks wrong, trust its height.
        const overlapNow = measured === 0 && Math.abs(rootBottom - windowHeight) < 8 ? e.endCoordinates.height : measured
        setOverlap(overlapNow)
        setKeyboardOpen(true)
        ensureVisible()
      })
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false)
      setOverlap(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [ensureVisible])

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y
    onScroll?.(e)
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={topEdge ? ['top'] : []}>
      <View ref={rootRef} collapsable={false} className="flex-1">
        <EnsureVisibleContext.Provider value={ensureVisible}>
          <View ref={scrollBoxRef} collapsable={false} className="flex-1">
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEventThrottle={16}
              onScroll={handleScroll}
              {...scrollProps}
            >
              {children}
            </ScrollView>
          </View>
        </EnsureVisibleContext.Provider>
        {footer}
        <View style={{ height: keyboardOpen ? overlap : insets.bottom }} />
      </View>
    </SafeAreaView>
  )
}
