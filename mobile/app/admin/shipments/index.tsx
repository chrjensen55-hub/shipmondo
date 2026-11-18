import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, X } from 'lucide-react-native'
import { AdminHeader } from '@/components/AdminHeader'
import { ShipmentRow, recipientName } from '@/components/ShipmentRow'
import { api } from '@/lib/api'
import { PADDED_MAX_WIDTH } from '@/lib/layout'
import type { ShipmondoShipment } from '@/lib/types'

export default function ShipmentsList() {
  const router = useRouter()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[] }>({ status: 'loading', shipments: [] })
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api<ShipmondoShipment[]>('/api/shipmondo/shipments?page=1&per_page=25')
      .then((shipments) => setState({ status: 'ready', shipments }))
      .catch(() => setState({ status: 'error', shipments: [] }))
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const filtered = state.shipments.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.reference ?? '').toLowerCase().includes(q) || recipientName(s).toLowerCase().includes(q) || (s.pkg_no ?? '').toLowerCase().includes(q)
  })

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <AdminHeader title="Shipments" subtitle="The 25 latest bookings" />
      <View className={`w-full ${PADDED_MAX_WIDTH} self-center px-5 pb-3`}>
        <View className="min-h-[52px] flex-row items-center gap-2 rounded-[8px] border-[1.5px] border-line bg-white px-3.5">
          <Search size={18} color="#6B7280" />
          <TextInput
            className="min-h-[52px] flex-1 text-base text-ink"
            placeholder="Search reference, tracking or recipient"
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search shipments"
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={10}>
              <X size={18} color="#6B7280" />
            </Pressable>
          ) : null}
        </View>
      </View>
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
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} colors={['#0B4F82']} tintColor="#0B4F82" />}
        ListEmptyComponent={state.status === 'ready' ? <Text className="mt-10 text-center text-base text-muted">No shipments found.</Text> : null}
        renderItem={({ item }) => <ShipmentRow shipment={item} onPress={() => router.push(`/admin/shipments/${item.id}`)} />}
      />
    </SafeAreaView>
  )
}
