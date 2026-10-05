import { useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Bluetooth } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { clearPairedPrinter, getPairedPrinter, pairPrinter, requestBlePermissions, scanForPrinters, type ScannedDevice } from '@/lib/zebraBluetooth'

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
      () => setError('We could not search for printers. Check that Bluetooth is turned on and try again.'),
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
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="items-center gap-1.5 p-5">
        <Bluetooth color="#075985" size={28} />
        <Text className="text-center text-lg font-extrabold text-ink" accessibilityRole="header">
          {paired ? `Paired with ${paired.name}` : 'No printer paired'}
        </Text>
        <Text className="text-center text-sm text-muted">Connects directly to the Zebra printer over Bluetooth. Look for a name starting with ZTC, ZQ or ZD, followed by the model number.</Text>
      </View>
      {error ? (
        <View className="mx-5 mb-2 rounded-sm bg-error-bg p-3">
          <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : null}
      <FlatList
        className="flex-1 px-5"
        data={found}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center justify-between gap-3 rounded-sm border border-line bg-white p-3.5">
            <Text className="flex-shrink text-base font-semibold text-ink">{item.name}</Text>
            <View className="w-40">
              <Button label={paired?.id === item.id ? 'In use' : 'Use this printer'} variant="secondary" onPress={() => choose(item)} disabled={paired?.id === item.id} />
            </View>
          </View>
        )}
      />
      <View className="gap-2.5 p-5">
        <Button label={scanning ? 'Scanning…' : 'Scan for printer'} onPress={startScan} loading={scanning} />
        {paired ? <Button label="Forget this printer" variant="secondary" onPress={forget} /> : null}
      </View>
    </SafeAreaView>
  )
}
