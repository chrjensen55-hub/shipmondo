import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Menu, Home, Settings as SettingsIcon } from 'lucide-react-native'
import { WizardProvider } from '@/lib/wizard-context'
import { getSettingsPin } from '@/lib/settingsPin'
import { LangContext, DEFAULT_LANG, LANG_STORAGE_KEY, useLang, type Lang } from '@/lib/i18n'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { colors, radius } from '@/lib/theme'

// A floating button rather than a native header bar: the wizard screens each already manage
// their own full-screen layout and SafeAreaView insets, so adding a real header here would
// double up on top spacing across every one of them. This floats above whichever screen is
// active instead, without touching each screen's own layout.
function HamburgerMenu() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tr = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinPromptOpen, setPinPromptOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  function closeAll() {
    setMenuOpen(false)
    setPinPromptOpen(false)
    setPin('')
    setPinError(false)
  }

  function goHome() {
    closeAll()
    router.push('/send')
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
      <Pressable style={[styles.button, { top: insets.top + 8 }]} onPress={() => setMenuOpen(true)}>
        <Menu size={20} color={colors.ink} />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.backdrop} onPress={closeAll}>
          <View style={[styles.menu, { top: insets.top + 56 }]}>
            <Pressable style={styles.menuItem} onPress={goHome}>
              <Home size={18} color={colors.ink} />
              <Text style={styles.menuItemText}>{tr.menuHome}</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={openSettings}>
              <SettingsIcon size={18} color={colors.ink} />
              <Text style={styles.menuItemText}>{tr.menuSettings}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={pinPromptOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.backdrop} onPress={closeAll}>
          <Pressable style={styles.pinCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pinTitle}>{tr.settingsCodePrompt}</Text>
            <TextInput
              style={styles.pinInput}
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
            />
            {pinError && <Text style={styles.pinError}>{tr.settingsCodeIncorrect}</Text>}
            <Pressable style={styles.pinButton} onPress={submitPin}>
              <Text style={styles.pinButtonText}>{tr.continueAction}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 50,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 36, 54, 0.2)' },
  menu: {
    position: 'absolute',
    left: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  pinCard: { margin: 'auto', backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, width: '100%', maxWidth: 320, gap: 12, alignItems: 'center' },
  pinTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  pinInput: { width: '100%', minHeight: 56, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, fontSize: 24, letterSpacing: 12, textAlign: 'center', color: colors.ink },
  pinError: { color: colors.error, fontSize: 13 },
  pinButton: { minHeight: 48, paddingHorizontal: 28, borderRadius: radius.md, backgroundColor: colors.ocean, alignItems: 'center', justifyContent: 'center' },
  pinButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
})
