import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useLocations } from '@/lib/location-context'
import type { CarrierName, LocationConfig, RateBracket } from '@/lib/locations'

const CARRIER_NAMES: CarrierName[] = ['DAO', 'Bring', 'PostNord', 'GLS']

export default function LocationScreen() {
  const router = useRouter()
  const { locations, activeLocationId, selectActiveLocation, saveLocation } = useLocations()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraftLocation] = useState<LocationConfig | null>(null)
  const [saved, setSaved] = useState(false)

  async function openLocation(location: LocationConfig) {
    await selectActiveLocation(location.id)
    setDraftLocation(location)
    setEditingId(location.id)
    setSaved(false)
  }

  function updateRate(index: number, key: 'home' | 'service_point', value: string) {
    if (!draft) return
    const n = Number(value.replace(/[^0-9.]/g, ''))
    setDraftLocation({ ...draft, rates: draft.rates.map((r, i) => (i === index ? { ...r, [key]: Number.isFinite(n) ? n : 0 } : r)) })
  }

  function toggleCarrier(name: CarrierName) {
    if (!draft) return
    setDraftLocation({ ...draft, carriers: { ...draft.carriers, [name]: !draft.carriers[name] } })
  }

  async function save() {
    if (!draft) return
    await saveLocation(draft)
    setSaved(true)
  }

  if (editingId && draft) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-10">
          <Pressable accessibilityRole="button" onPress={() => setEditingId(null)} className="flex-row items-center gap-1 py-1">
            <ChevronLeft size={18} color="#0B6EF3" />
            <Text className="text-base font-semibold text-ocean">All locations</Text>
          </Pressable>
          <Text className="text-[28px] font-semibold text-ink" accessibilityRole="header">
            {draft.name}
          </Text>
          <Text className="text-sm text-muted">This is now the active location — customers on this tablet see only these carriers and prices.</Text>

          <View className="gap-2.5 rounded-md border border-line bg-white p-4">
            <Text className="text-lg font-bold text-ink">Carriers</Text>
            {CARRIER_NAMES.map((name) => {
              const enabled = draft.carriers[name]
              return (
                <Pressable
                  key={name}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: enabled }}
                  onPress={() => toggleCarrier(name)}
                  className="flex-row items-center justify-between rounded-sm border border-line bg-white px-4 py-3.5"
                >
                  <Text className="text-base font-semibold text-ink">{name}</Text>
                  <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${enabled ? 'border-ocean bg-ocean' : 'border-line bg-white'}`}>
                    {enabled && <Check size={15} color="#ffffff" />}
                  </View>
                </Pressable>
              )
            })}
          </View>

          <View className="gap-3 rounded-md border border-line bg-white p-4">
            <Text className="text-lg font-bold text-ink">Prices (DKK)</Text>
            <Text className="text-sm text-muted">The same price applies no matter which carrier above is booked.</Text>
            {draft.rates.map((bracket: RateBracket, i: number) => {
              const lower = i === 0 ? 0 : draft.rates[i - 1].maxWeight
              return (
                <View key={bracket.maxWeight} className="gap-2 rounded-sm border border-line bg-cream p-3.5">
                  <Text className="text-sm font-bold text-ink">
                    {lower} – {bracket.maxWeight} kg
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <TextField
                        label="Pickup point"
                        keyboardType="decimal-pad"
                        editable={bracket.service_point !== null}
                        value={bracket.service_point === null ? '' : String(bracket.service_point)}
                        placeholder={bracket.service_point === null ? 'Not available' : undefined}
                        onChangeText={(v) => updateRate(i, 'service_point', v)}
                      />
                    </View>
                    <View className="flex-1">
                      <TextField label="Home delivery" keyboardType="decimal-pad" value={String(bracket.home)} onChangeText={(v) => updateRate(i, 'home', v)} />
                    </View>
                  </View>
                </View>
              )
            })}
          </View>

          {saved && <Text className="text-sm font-semibold text-success">Saved.</Text>}
          <Button label="Save prices" onPress={save} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-3 p-5 pb-10">
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="flex-row items-center gap-1 py-1">
          <ChevronLeft size={18} color="#0B6EF3" />
          <Text className="text-base font-semibold text-ocean">Settings</Text>
        </Pressable>
        <Text className="text-[28px] font-semibold text-ink" accessibilityRole="header">
          Locations
        </Text>
        <Text className="-mt-1 text-sm text-muted">Pick a location to make it active for this tablet and edit its prices.</Text>
        {locations.map((location) => {
          const active = location.id === activeLocationId
          const carriersOn = CARRIER_NAMES.filter((n) => location.carriers[n]).length
          return (
            <Pressable
              key={location.id}
              accessibilityRole="button"
              onPress={() => openLocation(location)}
              className={`flex-row items-center justify-between rounded-md border-2 bg-white p-4 active:bg-cream ${active ? 'border-ocean bg-mint' : 'border-line'}`}
            >
              <View className="gap-0.5">
                <Text className="text-base font-bold text-ink">{location.name}</Text>
                <Text className="text-sm text-muted">
                  {carriersOn} of {CARRIER_NAMES.length} carriers on{active ? ' · Active' : ''}
                </Text>
              </View>
              <ChevronRight size={20} color="#64748B" />
            </Pressable>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
