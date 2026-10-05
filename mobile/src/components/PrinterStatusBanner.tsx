import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { isPrinterPaired } from '@/lib/zebraBluetooth'

const CHECK_INTERVAL_MS = 25000

// Warns across Admin the moment the printer pairing is lost, instead of staff finding out only when
// a customer's print fails.
export function PrinterStatusBanner() {
  const [paired, setPaired] = useState(true)

  useEffect(() => {
    let cancelled = false
    function check() {
      isPrinterPaired().then((ok) => {
        if (!cancelled) setPaired(ok)
      })
    }
    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (paired) return null

  return (
    <View className="flex-row items-center gap-2.5 border-b border-line bg-[#fff8e6] px-4 py-2.5" accessibilityRole="alert">
      <TriangleAlert size={18} color="#8a5a00" />
      <Text className="flex-1 text-sm font-semibold text-[#8a5a00]">No printer is paired. Printing will fail until one is paired again in the Printer tab.</Text>
    </View>
  )
}
