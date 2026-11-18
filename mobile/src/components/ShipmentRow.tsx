import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { ShipmondoShipment } from '@/lib/types'

// Shipmondo sends prices as text such as "119.0". Show whole kroner without the ".0".
export function formatPrice(price: string) {
  const n = Number(price)
  if (!Number.isFinite(n)) return price
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function recipientName(s: ShipmondoShipment) {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

// One booked shipment in a list: reference and recipient on the left, price on the right, and an
// arrow that shows the row opens the shipment.
export function ShipmentRow({ shipment, onPress }: { shipment: ShipmondoShipment; onPress: () => void }) {
  const reference = shipment.reference || `#${shipment.id}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reference}, ${recipientName(shipment)}`}
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 rounded-md border border-line bg-white px-4 py-3 active:bg-cream"
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-ink">{reference}</Text>
        <Text className="text-sm text-ink">{recipientName(shipment)}</Text>
        <Text className="text-sm text-muted">
          {shipment.carrier_code} · {shipment.description}
        </Text>
      </View>
      <Text className="text-base font-bold text-ocean">{formatPrice(shipment.price)} DKK</Text>
      <ChevronRight size={20} color="#94A3B8" />
    </Pressable>
  )
}
