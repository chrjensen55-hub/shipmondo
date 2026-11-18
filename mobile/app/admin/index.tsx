import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AdminHeader } from '@/components/AdminHeader'
import { Button } from '@/components/Button'
import { PrinterStatusBanner } from '@/components/PrinterStatusBanner'
import { ShipmentRow } from '@/components/ShipmentRow'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PADDED_MAX_WIDTH } from '@/lib/layout'
import type { ShipmondoShipment } from '@/lib/types'

export default function Dashboard() {
  const { logout } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[] }>({ status: 'loading', shipments: [] })

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api<ShipmondoShipment[]>('/api/shipmondo/shipments?page=1&per_page=10')
      .then((shipments) => setState({ status: 'ready', shipments }))
      .catch(() => setState({ status: 'error', shipments: [] }))
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <AdminHeader
        title="Shipping Dashboard"
        subtitle="Recent shipments"
        action={
          <View className="w-32">
            <Button label="Sign out" variant="secondary" onPress={logout} />
          </View>
        }
      />
      <PrinterStatusBanner />
      {state.status === 'error' && (
        <View className={`w-full ${PADDED_MAX_WIDTH} self-center px-5 pb-2`}>
          <View className="rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              We could not load shipments. Pull down to try again.
            </Text>
          </View>
        </View>
      )}
      <FlatList
        className="flex-1"
        contentContainerClassName={`w-full ${PADDED_MAX_WIDTH} gap-2.5 self-center px-5 pb-5`}
        data={state.shipments}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} colors={['#0B4F82']} tintColor="#0B4F82" />}
        ListEmptyComponent={state.status === 'ready' ? <Text className="mt-10 text-center text-base text-muted">No shipments booked yet.</Text> : null}
        renderItem={({ item }) => <ShipmentRow shipment={item} onPress={() => router.push(`/admin/shipments/${item.id}`)} />}
      />
    </SafeAreaView>
  )
}
