import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/lib/api'
import type { ShipmondoShipment } from '@/lib/types'

function recipientName(s: ShipmondoShipment) {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

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
      <Text className="px-5 pt-4 text-xl font-extrabold text-ink" accessibilityRole="header">
        Shipments
      </Text>
      <View className="px-5 pb-2 pt-3">
        <TextInput
          className="min-h-[52px] rounded-sm border-[1.5px] border-line bg-white px-3.5 text-base text-ink"
          placeholder="Search reference, tracking or recipient"
          placeholderTextColor="#5c7080"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search shipments"
        />
      </View>
      {state.status === 'error' && (
        <Text className="mb-2 text-center text-sm font-medium text-error" accessibilityRole="alert">
          We could not load shipments. Pull down to try again.
        </Text>
      )}
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-2 px-5 pb-5"
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        ListEmptyComponent={state.status === 'ready' ? <Text className="mt-10 text-center text-base text-muted">No shipments found.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.reference || `#${item.id}`}, ${recipientName(item)}`}
            onPress={() => router.push(`/admin/shipments/${item.id}`)}
            className="flex-row items-center rounded-sm border border-line bg-white p-3.5 active:bg-cream"
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-ink">{item.reference || `#${item.id}`}</Text>
              <Text className="mt-0.5 text-sm text-muted">{recipientName(item)}</Text>
            </View>
            <Text className="font-bold text-green">{item.price} DKK</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}
