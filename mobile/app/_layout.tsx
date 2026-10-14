import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/lib/auth-context'
import { LocationProvider } from '@/lib/location-context'
import { applyTextSize, loadTextSize } from '@/lib/textSize'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout() {
  useEffect(() => {
    loadTextSize().then(applyTextSize)
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <LocationProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </LocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
