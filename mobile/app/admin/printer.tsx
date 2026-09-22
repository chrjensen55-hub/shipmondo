import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Bluetooth } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { clearPairedPrinter, getPairedPrinter, pairPrinter, requestBlePermissions, scanForPrinters, type ScannedDevice } from '@/lib/zebraBluetooth'
import { colors, radius } from '@/lib/theme'

export default function PrinterSettings() {
  const [paired, setPaired] = useState<ScannedDevice | null>(null)
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<ScannedDevice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getPairedPrinter().then(setPaired)
  }, [])

  async function startScan() {
    setError('')
    setFound([])
    const granted = await requestBlePermissions()
    if (!granted) {
      setError('Bluetooth permission is required to scan for the printer.')
      return
    }
    setScanning(true)
    const stop = scanForPrinters(
      (device) => setFound((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device])),
      (message) => setError(message),
    )
    setTimeout(() => {
      stop()
      setScanning(false)
    }, 8000)
  }

  async function choose(device: ScannedDevice) {
    await pairPrinter(device)
    setPaired(device)
    setFound([])
  }

  async function forget() {
    await clearPairedPrinter()
    setPaired(null)
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Bluetooth color={colors.ocean} size={28} />
        <Text style={styles.title}>{paired ? `Paired with ${paired.name}` : 'No printer paired'}</Text>
        <Text style={styles.subtitle}>
          Connects directly to the Zebra printer over Bluetooth — look for a name starting with &quot;ZTC&quot; or &quot;ZQ&quot;/&quot;ZD&quot; plus the model number.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.list}
        data={found}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.name}</Text>
            <Button label={paired?.id === item.id ? 'In use' : 'Use this printer'} variant="secondary" onPress={() => choose(item)} disabled={paired?.id === item.id} />
          </View>
        )}
      />
      <View style={styles.actions}>
        <Button label={scanning ? 'Scanning…' : 'Scan for printer'} onPress={startScan} loading={scanning} />
        {paired ? <Button label="Forget this printer" variant="secondary" onPress={forget} /> : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { padding: 20, gap: 6, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  error: { color: colors.error, textAlign: 'center', marginBottom: 8 },
  list: { flex: 1, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  rowText: { fontWeight: '600', color: colors.ink, flexShrink: 1, marginRight: 8 },
  actions: { padding: 20, gap: 10 },
})
