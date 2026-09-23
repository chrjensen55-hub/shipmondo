import { Redirect } from 'expo-router'
import { Tabs, useRouter } from 'expo-router'
import { LayoutDashboard, Box, Printer as PrinterIcon, PackagePlus } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { colors } from '@/lib/theme'

export default function AdminLayout() {
  const { status } = useAuth()
  const router = useRouter()
  if (status === 'loading') return null
  if (status === 'signedOut') return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ocean,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tabs.Screen name="shipments/index" options={{ title: 'Shipments', tabBarIcon: ({ color, size }) => <Box color={color} size={size} /> }} />
      <Tabs.Screen name="shipments/[id]" options={{ href: null }} />
      <Tabs.Screen name="printer" options={{ title: 'Printer', tabBarIcon: ({ color, size }) => <PrinterIcon color={color} size={size} /> }} />
      <Tabs.Screen
        name="new-shipment"
        options={{ title: 'New shipment', tabBarIcon: ({ color, size }) => <PackagePlus color={color} size={size} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            router.push('/send')
          },
        }}
      />
    </Tabs>
  )
}
