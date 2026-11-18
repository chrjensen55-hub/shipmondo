import { useEffect, useState } from 'react'
import { FlatList, Platform, Text, View } from 'react-native'
import { Bluetooth } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AdminHeader } from '@/components/AdminHeader'
import { Button } from '@/components/Button'
import { PADDED_MAX_WIDTH } from '@/lib/layout'
import { clearPairedPrinter, getPairedPrinter, IOS_BLUETOOTH_MESSAGE, pairPrinter, requestBlePermissions, scanForPrinters, type ScannedDevice } from '@/lib/zebraBluetooth'

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
      setError(Platform.OS === 'ios' ? IOS_BLUETOOTH_MESSAGE : 'Bluetooth permission is required to scan for the printer.')
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
      <AdminHeader title="Printer" subtitle="The Zebra label printer this tablet prints on" />
      <View className={`w-full ${PADDED_MAX_WIDTH} flex-1 self-center px-5 pb-5`}>
        <View className="flex-row items-center gap-3.5 rounded-md border border-line bg-white p-4">
          <View className={`h-12 w-12 items-center justify-center rounded-full ${paired ? 'bg-success-bg' : 'bg-[#fff8e6]'}`}>
            <Bluetooth color={paired ? '#22A05B' : '#8a5a00'} size={24} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-bold text-ink" accessibilityRole="header">
              {paired ? `Paired with ${paired.name}` : 'No printer paired'}
            </Text>
            <Text className="text-sm text-muted">Connects directly to the Zebra printer over Bluetooth. Look for a name starting with ZTC, ZQ or ZD, followed by the model number.</Text>
          </View>
        </View>
        {error ? (
          <View className="mt-3 rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
        <FlatList
          className="mt-3 flex-1"
          data={found}
          keyExtractor={(d) => d.id}
          ListHeaderComponent={found.length ? <Text className="pb-2 text-xs font-bold uppercase text-muted">Printers found</Text> : null}
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center justify-between gap-3 rounded-md border border-line bg-white p-3.5">
              <Text className="flex-shrink text-base font-semibold text-ink">{item.name}</Text>
              <View className="w-40">
                <Button label={paired?.id === item.id ? 'In use' : 'Use this printer'} variant="secondary" onPress={() => choose(item)} disabled={paired?.id === item.id} />
              </View>
            </View>
          )}
        />
        <View className="gap-2.5 pt-3">
          <Button label={scanning ? 'Scanning…' : 'Scan for printer'} size="lg" onPress={startScan} loading={scanning} />
          {paired ? <Button label="Forget this printer" variant="secondary" onPress={forget} /> : null}
        </View>
      </View>
    </SafeAreaView>
  )
}
