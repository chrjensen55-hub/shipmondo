import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Menu, Home, RotateCcw, Settings as SettingsIcon } from 'lucide-react-native'
import { WizardProvider, useWizard, hasActiveShipmentData } from '@/lib/wizard-context'
import { getSettingsPin } from '@/lib/settingsPin'
import { LangContext, DEFAULT_LANG, LANG_STORAGE_KEY, useLang, type Lang } from '@/lib/i18n'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/Button'

// Floating controls rather than a native header: each wizard screen already manages its own
// full-screen layout and safe-area padding, so one shared header would double up the top spacing.
function HamburgerMenu() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tr = useLang()
  const { draft, reset } = useWizard()
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
        <Menu size={22} color="#0f2436" />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable className="flex-1 bg-ink/20" onPress={closeAll}>
          <View className="absolute left-3 min-w-[200px] rounded-md border border-line bg-white py-1.5 shadow-lg" style={{ top: insets.top + 72 }}>
            <MenuItem icon={<Home size={18} color="#0f2436" />} label={tr.menuHome} onPress={goHome} />
            <MenuItem icon={<RotateCcw size={18} color="#0f2436" />} label={tr.menuRefresh} onPress={requestRefresh} />
            <MenuItem icon={<SettingsIcon size={18} color="#0f2436" />} label={tr.menuSettings} onPress={openSettings} />
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
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        <HamburgerMenu />
        <LanguageSwitch lang={lang} onChange={changeLang} />
      </WizardProvider>
    </LangContext.Provider>
  )
}
