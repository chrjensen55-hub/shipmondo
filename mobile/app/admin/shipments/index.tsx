import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, ApiError } from '@/lib/api'
import type { ShipmondoShipment } from '@/lib/types'
import { colors, radius } from '@/lib/theme'

function recipientName(s: ShipmondoShipment) {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

export default function ShipmentsList() {
  const router = useRouter()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[]; message?: string }>({ status: 'loading', shipments: [] })
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api<ShipmondoShipment[]>('/api/shipmondo/shipments?page=1&per_page=25')
      .then((shipments) => setState({ status: 'ready', shipments }))
      .catch((err) => setState({ status: 'error', shipments: [], message: err instanceof ApiError ? err.message : 'Could not load shipments.' }))
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>Shipments</Text>
      <TextInput style={styles.search} placeholder="Search reference, tracking or recipient" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
      {state.status === 'error' && <Text style={styles.error}>{state.message}</Text>}
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        ListEmptyComponent={state.status === 'ready' ? <Text style={styles.empty}>No shipments found.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/admin/shipments/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.reference || `#${item.id}`}</Text>
              <Text style={styles.rowSub}>{recipientName(item)}</Text>
            </View>
            <Text style={styles.rowPrice}>{item.price} DKK</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, paddingTop: 16 },
  search: { margin: 20, marginBottom: 10, minHeight: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14, color: colors.ink },
  error: { color: colors.error, textAlign: 'center', marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 14 },
  rowTitle: { fontWeight: '700', color: colors.ink },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rowPrice: { fontWeight: '700', color: colors.green },
})
