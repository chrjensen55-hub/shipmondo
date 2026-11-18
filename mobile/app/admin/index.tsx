import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight, MessageSquare } from 'lucide-react-native'
import { AdminHeader } from '@/components/AdminHeader'
import { Button } from '@/components/Button'
import { PrinterStatusBanner } from '@/components/PrinterStatusBanner'
import { ShipmentRow } from '@/components/ShipmentRow'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useCenter } from '@/lib/center-context'
import { PADDED_MAX_WIDTH } from '@/lib/layout'
import type { ShipmondoShipment } from '@/lib/types'

export default function Dashboard() {
  const { logout } = useAuth()
  const router = useRouter()
  const { unread } = useCenter()
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
      {unread > 0 && (
        <View className={`w-full ${PADDED_MAX_WIDTH} self-center px-5 pb-3`}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${unread} new ${unread === 1 ? 'message' : 'messages'} from head office. Open messages.`}
            onPress={() => router.push('/admin/messages')}
            className="min-h-[60px] flex-row items-center gap-3 rounded-md border-2 border-ocean bg-mint px-4 py-3 active:bg-white"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-ocean">
              <MessageSquare size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink">
                {unread} new {unread === 1 ? 'message' : 'messages'} from head office
              </Text>
              <Text className="text-sm text-muted">Tap to read and answer</Text>
            </View>
            <ChevronRight size={20} color="#0B4F82" />
          </Pressable>
        </View>
      )}
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
