import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
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
  noEmail,
  onToggleNoEmail,
  noPhone,
  onToggleNoPhone,
}: {
  value: Address
  onChange: (key: keyof Address, v: string) => void
  minimal?: boolean
  // Recipient-only: lets staff skip requiring the recipient's own email and/or phone (common for
  // walk-in customers sending on someone else's behalf who don't have those details) and use the
  // sender's instead, since Shipmondo still needs a valid contact on the recipient party. Email and
  // phone are independent — a customer might have one but not the other.
  noEmail?: boolean
  onToggleNoEmail?: (checked: boolean) => void
  noPhone?: boolean
  onToggleNoPhone?: (checked: boolean) => void
}) {
  const tr = useLang()
  const showNoEmailOption = onToggleNoEmail !== undefined
  const showNoPhoneOption = onToggleNoPhone !== undefined
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

  // Next/Done chain: each field's keyboard action jumps to the next visible, editable field, and the
  // last one closes the keyboard. The country picker isn't a text field, so it's skipped.
  const fullNameRef = useRef<TextInput>(null)
  const companyRef = useRef<TextInput>(null)
  const address1Ref = useRef<TextInput>(null)
  const address2Ref = useRef<TextInput>(null)
  const postalCodeRef = useRef<TextInput>(null)
  const cityRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)
  type FieldKey = 'fullName' | 'company' | 'address1' | 'address2' | 'postalCode' | 'city' | 'email' | 'phone'
  function next(from: FieldKey) {
    const refs = { fullName: fullNameRef, company: companyRef, address1: address1Ref, address2: address2Ref, postalCode: postalCodeRef, city: cityRef, email: emailRef, phone: phoneRef }
    const order = (['fullName', 'company', 'address1', 'address2', 'postalCode', 'city', 'email', 'phone'] as FieldKey[]).filter((key) => {
      if (minimal && (key === 'company' || key === 'address2')) return false
      if (key === 'email' && noEmail) return false
      if (key === 'phone' && noPhone) return false
      return true
    })
    const target = order[order.indexOf(from) + 1]
    if (target) refs[target].current?.focus()
    else Keyboard.dismiss()
  }
  const isDenmark = value.country === 'DK'

  return (
    <View className="gap-3">
      <TextField inputRef={fullNameRef} label={tr.fullName} value={value.fullName} onChangeText={(v) => onChange('fullName', v)} autoCapitalize="words" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => next('fullName')} />
      {!minimal && (
        <TextField inputRef={companyRef} label={`${tr.company} (${tr.optional})`} value={value.company ?? ''} onChangeText={(v) => onChange('company', v)} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => next('company')} />
      )}
      <TextField inputRef={address1Ref} label={tr.addressLine1} value={value.address1} onChangeText={(v) => onChange('address1', v)} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => next('address1')} />
      {!minimal && (
        <TextField inputRef={address2Ref} label={`${tr.addressLine2} (${tr.optional})`} value={value.address2 ?? ''} onChangeText={(v) => onChange('address2', v)} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => next('address2')} />
      )}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            inputRef={postalCodeRef}
            label={tr.postalCode}
            value={value.postalCode}
            onChangeText={(v) => onChange('postalCode', v)}
            keyboardType={isDenmark ? 'number-pad' : 'default'}
            autoCapitalize={isDenmark ? 'none' : 'characters'}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => next('postalCode')}
            placeholder="2730"
            error={status === 'notFound' ? tr.cityNotFound : undefined}
          />
        </View>
        <View className="flex-[2] gap-1.5">
          <TextField inputRef={cityRef} label={tr.city} value={value.city} onChangeText={(v) => onChange('city', v)} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => next('city')} />
          {status === 'loading' && (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#0B4F82" />
              <Text className="text-xs font-medium text-muted">{tr.findingCity}</Text>
            </View>
          )}
          {status === 'found' && (
            <View className="flex-row items-center gap-1.5">
              <Check size={13} color="#22A05B" />
              <Text className="text-xs font-medium text-success">{tr.cityFoundShort}</Text>
            </View>
          )}
        </View>
      </View>
      <View className="gap-1.5">
        <Text className="text-[13px] font-medium text-ink">{tr.country}</Text>
        <View className="overflow-hidden rounded-[8px] border-[1.5px] border-line bg-white">
          <Picker selectedValue={value.country} onValueChange={(v) => onChange('country', v)}>
            {countries.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} />
            ))}
          </Picker>
        </View>
      </View>
      {showNoEmailOption && <ContactCheckbox checked={!!noEmail} onToggle={() => onToggleNoEmail?.(!noEmail)} label={tr.noRecipientEmail} />}
      <TextField
        inputRef={emailRef}
        label={noEmail ? `${tr.email} (${tr.optional})` : tr.email}
        value={value.email}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => next('email')}
        editable={!noEmail}
      />
      {noEmail && <Text className="-mt-1.5 text-xs text-muted">{tr.noRecipientContactNote}</Text>}

      {showNoPhoneOption && <ContactCheckbox checked={!!noPhone} onToggle={() => onToggleNoPhone?.(!noPhone)} label={tr.noRecipientPhone} />}
      <PhoneField inputRef={phoneRef} label={tr.mobilePhone} value={value.phone} onChange={(v) => onChange('phone', v)} editable={!noPhone} returnKeyType="done" />
      {noPhone && <Text className="-mt-1.5 text-xs text-muted">{tr.noRecipientContactNote}</Text>}
    </View>
  )
}

function ContactCheckbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} className="flex-row items-center gap-3 py-1">
      <View className={`h-6 w-6 items-center justify-center rounded-[6px] border-2 ${checked ? 'border-ocean bg-ocean' : 'border-line bg-white'}`}>
        {checked && <Check size={15} color="#ffffff" />}
      </View>
      <Text className="flex-1 text-sm text-ink">{label}</Text>
    </Pressable>
  )
}
