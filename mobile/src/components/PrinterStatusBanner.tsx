import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { isPrinterPaired } from '@/lib/zebraBluetooth'

const CHECK_INTERVAL_MS = 25000

// Mirrors the web app's PrinterStatusBanner — warns across Admin the moment the printer pairing
// is lost, instead of staff finding out only when a customer's print fails.
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
    <View style={styles.banner}>
      <TriangleAlert size={18} color="#8a5a00" />
      <Text style={styles.text}>No printer paired — printing will fail until one is paired again in the Printer tab.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff8e6', borderBottomWidth: 1, borderBottomColor: '#f0dca0', paddingVertical: 10, paddingHorizontal: 16 },
  text: { flex: 1, color: '#8a5a00', fontWeight: '600', fontSize: 13 },
})
