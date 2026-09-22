import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { PrinterStatusBanner } from '@/components/PrinterStatusBanner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { ShipmondoShipment } from '@/lib/types'
import { colors, radius } from '@/lib/theme'

function recipientName(s: ShipmondoShipment) {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

export default function Dashboard() {
  const { logout } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[]; message?: string }>({ status: 'loading', shipments: [] })

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    api<ShipmondoShipment[]>('/api/shipmondo/shipments?page=1&per_page=10')
      .then((shipments) => setState({ status: 'ready', shipments }))
      .catch((err) => setState({ status: 'error', shipments: [], message: err instanceof ApiError ? err.message : 'Could not load shipments.' }))
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shipping Dashboard</Text>
          <Text style={styles.subtitle}>Recent shipments</Text>
        </View>
        <Button label="Sign out" variant="secondary" onPress={logout} />
      </View>
      <PrinterStatusBanner />
      {state.status === 'error' && <Text style={styles.error}>{state.message}</Text>}
      <FlatList
        contentContainerStyle={styles.list}
        data={state.shipments}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={state.status === 'loading'} onRefresh={load} />}
        ListEmptyComponent={state.status === 'ready' ? <Text style={styles.empty}>No shipments booked yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/admin/shipments/${item.id}`)}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.reference || `#${item.id}`}</Text>
              <Text style={styles.cardPrice}>{item.price} DKK</Text>
            </View>
            <Text style={styles.cardSub}>{recipientName(item)}</Text>
            <Text style={styles.cardMeta}>
              {item.carrier_code} · {item.description}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  error: { color: colors.error, textAlign: 'center', marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  cardPrice: { fontWeight: '700', color: colors.green },
  cardSub: { color: colors.ink },
  cardMeta: { color: colors.muted, fontSize: 13 },
})
