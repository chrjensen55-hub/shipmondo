import { Stack, useRouter } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { WizardProvider } from '@/lib/wizard-context'
import { colors } from '@/lib/theme'

// A floating button rather than a native header bar: the wizard screens each already manage
// their own full-screen layout and SafeAreaView insets, so adding a real header here would
// double up on top spacing across every one of them. This floats above whichever screen is
// active instead, without touching each screen's own layout.
function AdminButton() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  return (
    <Pressable style={[styles.button, { top: insets.top + 8 }]} onPress={() => router.push('/admin')}>
      <Settings size={20} color={colors.ink} />
    </Pressable>
  )
}

export default function SendLayout() {
  return (
    <WizardProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <AdminButton />
    </WizardProvider>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 12,
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
})
