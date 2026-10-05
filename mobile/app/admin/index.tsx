import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { PrinterStatusBanner } from '@/components/PrinterStatusBanner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { ShipmondoShipment } from '@/lib/types'

function recipientName(s: ShipmondoShipment) {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

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
      <View className="flex-row items-center justify-between p-5">
        <View>
          <Text className="text-xl font-extrabold text-ink" accessibilityRole="header">
            Shipping Dashboard
          </Text>
          <Text className="mt-0.5 text-sm text-muted">Recent shipments</Text>
        </View>
        <View className="w-32">
          <Button label="Sign out" variant="secondary" onPress={logout} />
        </View>
      </View>
      <PrinterStatusBanner />
      {state.status === 'error' && (
        <Text className="mb-2 text-center text-sm font-medium text-error" accessibilityRole="alert">
          We could not load shipments. Pull down to try again.
        </Text>
      )}
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-2.5 px-5 pb-5"
        data={state.shipments}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} />}
        ListEmptyComponent={state.status === 'ready' ? <Text className="mt-10 text-center text-base text-muted">No shipments booked yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.reference || `#${item.id}`}, ${recipientName(item)}`}
            onPress={() => router.push(`/admin/shipments/${item.id}`)}
            className="gap-1 rounded-md border border-line bg-white p-4 active:bg-cream"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-ink">{item.reference || `#${item.id}`}</Text>
              <Text className="font-bold text-green">{item.price} DKK</Text>
            </View>
            <Text className="text-base text-ink">{recipientName(item)}</Text>
            <Text className="text-sm text-muted">
              {item.carrier_code} · {item.description}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}
