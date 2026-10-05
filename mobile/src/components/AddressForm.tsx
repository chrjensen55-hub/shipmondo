import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Check } from 'lucide-react-native'
import { TextField } from './TextField'
import { PhoneField } from './PhoneField'
import { countries } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import type { Address } from '@/lib/types'

// Danish postal codes resolve to a city through the server's /api/postal route, so the city is
// filled in automatically for Denmark. Other countries keep City as a normal typed field.
type LookupResult = { code: string; status: 'found' | 'notFound' | 'unavailable' }

export function AddressForm({
  value,
  onChange,
  minimal = false,
  noContact,
  onToggleNoContact,
}: {
  value: Address
  onChange: (key: keyof Address, v: string) => void
  minimal?: boolean
  // Recipient-only: lets staff skip requiring the recipient's own email/phone (common for
  // walk-in customers sending on someone else's behalf who don't have those details) and use the
  // sender's instead, since Shipmondo still needs a valid contact on the recipient party.
  noContact?: boolean
  onToggleNoContact?: (checked: boolean) => void
}) {
  const tr = useLang()
  const showNoContactOption = onToggleNoContact !== undefined
  const [result, setResult] = useState<LookupResult | null>(null)
  const lookupCode = value.country === 'DK' && /^\d{4}$/.test(value.postalCode) ? value.postalCode : null
  // Loading is derived rather than stored: a lookup is in flight whenever the current Danish postal
  // code has no result yet, so the effect below never has to set state synchronously.
  const status = lookupCode === null ? 'idle' : result?.code !== lookupCode ? 'loading' : result.status

  useEffect(() => {
    if (lookupCode === null) return
    let cancelled = false
    api<{ postalCode: string; city: string }>(`/api/postal/${lookupCode}`)
      .then((data) => {
        if (cancelled) return
        setResult({ code: lookupCode, status: 'found' })
        onChange('city', data.city)
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ code: lookupCode, status: err instanceof ApiError && err.status === 404 ? 'notFound' : 'unavailable' })
      })
    return () => {
      cancelled = true
    }
    // onChange is recreated every render; only a changed postal code or country should start a lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupCode])

  return (
    <View className="gap-4">
      <TextField label={tr.fullName} value={value.fullName} onChangeText={(v) => onChange('fullName', v)} />
      {!minimal && <TextField label={`${tr.company} (${tr.optional})`} value={value.company ?? ''} onChangeText={(v) => onChange('company', v)} />}
      <TextField label={tr.addressLine1} value={value.address1} onChangeText={(v) => onChange('address1', v)} />
      {!minimal && <TextField label={`${tr.addressLine2} (${tr.optional})`} value={value.address2 ?? ''} onChangeText={(v) => onChange('address2', v)} />}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label={tr.postalCode}
            value={value.postalCode}
            onChangeText={(v) => onChange('postalCode', v)}
            keyboardType="numbers-and-punctuation"
            placeholder="2730"
            error={status === 'notFound' ? tr.cityNotFound : undefined}
          />
        </View>
        <View className="flex-[2] gap-1.5">
          <TextField label={tr.city} value={value.city} onChangeText={(v) => onChange('city', v)} />
          {status === 'loading' && (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#075985" />
              <Text className="text-sm font-semibold text-muted">{tr.findingCity}</Text>
            </View>
          )}
          {status === 'found' && (
            <View className="flex-row items-center gap-1.5">
              <Check size={14} color="#0a7a4a" />
              <Text className="text-sm font-semibold text-success">{tr.cityFound}</Text>
            </View>
          )}
        </View>
      </View>
      <View className="gap-1.5">
        <Text className="text-sm font-semibold text-ink">{tr.country}</Text>
        <View className="overflow-hidden rounded-sm border-[1.5px] border-line bg-white">
          <Picker selectedValue={value.country} onValueChange={(v) => onChange('country', v)}>
            {countries.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} />
            ))}
          </Picker>
        </View>
      </View>
      {showNoContactOption && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!noContact }}
          onPress={() => onToggleNoContact?.(!noContact)}
          className="flex-row items-center gap-3 py-1"
        >
          <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${noContact ? 'border-ocean bg-ocean' : 'border-line bg-white'}`}>
            {noContact && <Check size={15} color="#ffffff" />}
          </View>
          <Text className="flex-1 text-base text-ink">{tr.noRecipientContact}</Text>
        </Pressable>
      )}
      <TextField label={tr.email} value={value.email} onChangeText={(v) => onChange('email', v)} keyboardType="email-address" autoCapitalize="none" editable={!noContact} />
      <PhoneField label={tr.mobilePhone} value={value.phone} onChange={(v) => onChange('phone', v)} editable={!noContact} />
      {noContact && <Text className="-mt-2 text-sm text-muted">{tr.noRecipientContactNote}</Text>}
    </View>
  )
}
