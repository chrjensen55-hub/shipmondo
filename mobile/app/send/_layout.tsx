import { useEffect, useState } from 'react'
import { Stack, usePathname, useRouter } from 'expo-router'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Menu, Home, RotateCcw, Lock, Settings as SettingsIcon } from 'lucide-react-native'
import { WizardProvider, useWizard, hasActiveShipmentData } from '@/lib/wizard-context'
import { getSettingsPin } from '@/lib/settingsPin'
import { markTouch, msSinceTouch, nowMs, useKiosk } from '@/lib/kiosk'
import { LangContext, DEFAULT_LANG, LANG_STORAGE_KEY, useLang, type Lang } from '@/lib/i18n'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { KioskCodeDialog } from '@/components/KioskCodeDialog'
import { Button } from '@/components/Button'

// Floating controls rather than a native header: each wizard screen already manages its own
// full-screen layout and safe-area padding, so one shared header would double up the top spacing.
function HamburgerMenu() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tr = useLang()
  const { draft, reset } = useWizard()
  const kiosk = useKiosk()
  const [kioskCodeOpen, setKioskCodeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinPromptOpen, setPinPromptOpen] = useState(false)
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  function closeAll() {
    setMenuOpen(false)
    setPinPromptOpen(false)
    setPin('')
    setPinError(false)
  }

  // Home returns to the first page without discarding anything the customer already entered.
  function goHome() {
    closeAll()
    router.dismissAll()
    router.replace('/send')
  }

  // Refresh restarts only the active shipment: clears the temporary draft and returns to step one.
  // Completed shipments and the shipment history live server-side and are untouched.
  function doRefresh() {
    setMenuOpen(false)
    setRefreshConfirmOpen(false)
    reset()
    router.dismissAll()
    router.replace('/send')
  }

  function requestRefresh() {
    setMenuOpen(false)
    if (hasActiveShipmentData(draft)) setRefreshConfirmOpen(true)
    else doRefresh()
  }

  function openSettings() {
    setMenuOpen(false)
    setPinPromptOpen(true)
  }

  // Turning kiosk mode on is immediate; turning it off always needs the exit code.
  function toggleKiosk() {
    setMenuOpen(false)
    if (kiosk.active) setKioskCodeOpen(true)
    else kiosk.activate()
  }

  async function submitPin() {
    const real = await getSettingsPin()
    if (pin === real) {
      closeAll()
      router.push('/admin')
    } else {
      setPinError(true)
      setPin('')
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr.menuLabel}
        onPress={() => setMenuOpen(true)}
        className="absolute left-3 z-50 h-11 w-11 items-center justify-center rounded-full border border-line bg-white shadow-sm active:bg-cream"
        style={{ top: insets.top + 20 }}
      >
        <Menu size={22} color="#0F1E33" />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable className="flex-1 bg-ink/20" onPress={closeAll}>
          <View className="absolute left-3 min-w-[200px] rounded-md border border-line bg-white py-1.5 shadow-lg" style={{ top: insets.top + 72 }}>
            <MenuItem icon={<Home size={18} color="#0F1E33" />} label={tr.menuHome} onPress={goHome} />
            <MenuItem icon={<RotateCcw size={18} color="#0F1E33" />} label={tr.menuRefresh} onPress={requestRefresh} />
            <MenuItem icon={<SettingsIcon size={18} color="#0F1E33" />} label={tr.menuSettings} onPress={openSettings} />
            {kiosk.featureEnabled && <MenuItem icon={<Lock size={18} color="#0F1E33" />} label={kiosk.active ? tr.kioskDisable : tr.kioskActivate} onPress={toggleKiosk} />}
          </View>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={refreshConfirmOpen}
        title={tr.refreshTitle}
        message={tr.refreshMessage}
        cancelLabel={tr.cancelAction}
        confirmLabel={tr.refreshAction}
        onCancel={() => setRefreshConfirmOpen(false)}
        onConfirm={doRefresh}
      />

      <KioskCodeDialog
        visible={kioskCodeOpen}
        title={tr.kioskEnterCode}
        onCancel={() => setKioskCodeOpen(false)}
        onSuccess={() => {
          setKioskCodeOpen(false)
          kiosk.deactivate()
        }}
      />

      <Modal visible={pinPromptOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable className="flex-1 items-center justify-center bg-ink/40 p-6" onPress={closeAll}>
          <Pressable className="w-full max-w-sm gap-4 rounded-lg bg-white p-6" onPress={(e) => e.stopPropagation()}>
            <Text className="text-xl font-extrabold text-ink">{tr.settingsCodePrompt}</Text>
            <TextInput
              className="min-h-[56px] rounded-sm border-[1.5px] border-line bg-white text-center text-2xl tracking-[12px] text-ink"
              value={pin}
              onChangeText={(v) => {
                setPin(v.replace(/[^0-9]/g, '').slice(0, 4))
                setPinError(false)
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
              onSubmitEditing={submitPin}
              accessibilityLabel={tr.settingsCodePrompt}
            />
            {pinError && <Text className="text-sm font-medium text-error">{tr.settingsCodeIncorrect}</Text>}
            <Button label={tr.continueAction} onPress={submitPin} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function MenuItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" className="flex-row items-center gap-3 px-4 py-3.5 active:bg-cream">
      {icon}
      <Text className="text-base font-semibold text-ink">{label}</Text>
    </Pressable>
  )
}

const IDLE_MS = 3 * 60 * 1000
const PROMPT_SECONDS = 10

// Privacy for the next customer: in kiosk mode, after 3 minutes without a touch the customer is asked
// whether they're still there; if nobody answers within 10 seconds the form is cleared and the app
// returns to step 1. The first page with nothing entered needs no reset, so it's left alone.
function IdleGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const tr = useLang()
  const { draft, reset } = useWizard()
  const { active } = useKiosk()
  const [promptSince, setPromptSince] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(PROMPT_SECONDS)
  const eligible = active && (hasActiveShipmentData(draft) || pathname !== '/send')

  useEffect(() => {
    const id = setInterval(() => {
      if (!eligible) {
        setPromptSince((v) => (v === null ? v : null))
        return
      }
      setPromptSince((since) => (since !== null ? since : msSinceTouch() >= IDLE_MS ? nowMs() : null))
    }, 1000)
    return () => clearInterval(id)
  }, [eligible])

  useEffect(() => {
    if (promptSince === null) return
    const id = setInterval(() => {
      const left = PROMPT_SECONDS - Math.floor((nowMs() - promptSince) / 1000)
      if (left > 0) {
        setSecondsLeft(left)
        return
      }
      reset()
      router.dismissAll()
      router.replace('/send')
      markTouch()
      setPromptSince(null)
      setSecondsLeft(PROMPT_SECONDS)
    }, 500)
    return () => clearInterval(id)
  }, [promptSince, reset, router])

  function stay() {
    markTouch()
    setPromptSince(null)
    setSecondsLeft(PROMPT_SECONDS)
  }

  return (
    <Modal visible={promptSince !== null} transparent animationType="fade" onRequestClose={stay}>
      <View className="flex-1 items-center justify-center bg-ink/50 p-6">
        <View className="w-full max-w-sm gap-4 rounded-md bg-white p-6" accessibilityViewIsModal>
          <Text className="text-xl font-bold text-ink" accessibilityRole="header">
            {tr.idleTitle}
          </Text>
          <Text className="text-base text-muted">
            {tr.idleMessage} ({secondsLeft})
          </Text>
          <Button label={tr.idleStay} onPress={stay} />
        </View>
      </View>
    </Modal>
  )
}

export default function SendLayout() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    SecureStore.getItemAsync(LANG_STORAGE_KEY).then((saved) => {
      if (saved === 'da' || saved === 'en') setLang(saved)
    })
  }, [])

  function changeLang(next: Lang) {
    setLang(next)
    SecureStore.setItemAsync(LANG_STORAGE_KEY, next).catch(() => {})
  }

  return (
    <LangContext.Provider value={lang}>
      <WizardProvider>
        <View className="flex-1" onTouchStart={markTouch}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
          <HamburgerMenu />
          <LanguageSwitch lang={lang} onChange={changeLang} />
        </View>
        <IdleGuard />
      </WizardProvider>
    </LangContext.Provider>
  )
}
