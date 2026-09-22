import { Stack } from 'expo-router'
import { WizardProvider } from '@/lib/wizard-context'

export default function SendLayout() {
  return (
    <WizardProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </WizardProvider>
  )
}
