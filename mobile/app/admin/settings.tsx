import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Cloud, KeyRound } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { getShipmondoConfig, setShipmondoConfig, clearShipmondoConfig } from '@/lib/shipmondoConfig'
import { getSettingsPin, setSettingsPin } from '@/lib/settingsPin'
import { api } from '@/lib/api'

type TestState = { status: 'idle' | 'testing' | 'ok' | 'error'; message?: string }

// Every real deployment uses this same production endpoint, so it's pre-filled. Staff only change
// the username and key, which is what actually differs between accounts.
const DEFAULT_BASE_URL = 'https://app.shipmondo.com/api/public/v3'

export default function SettingsScreen() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [configured, setConfigured] = useState(false)
  const [savingShipmondo, setSavingShipmondo] = useState(false)
  const [shipmondoSaved, setShipmondoSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    getShipmondoConfig().then((config) => {
      if (config) {
        setBaseUrl(config.baseUrl)
        setUsername(config.username)
        setApiKey(config.apiKey)
        setConfigured(true)
      }
    })
  }, [])

  async function saveShipmondo() {
    setSavingShipmondo(true)
    setShipmondoSaved(false)
    setSaveError('')
    try {
      await setShipmondoConfig({ baseUrl, username, apiKey })
      setConfigured(true)
      setShipmondoSaved(true)
      // Check the new credentials against Shipmondo straight away, so a typo shows up here rather
      // than at the printing step.
      await testConnection()
    } catch {
      setSaveError('We could not save these settings on this device. Please try again.')
    } finally {
      setSavingShipmondo(false)
    }
  }

  async function removeShipmondo() {
    await clearShipmondoConfig()
    setBaseUrl(DEFAULT_BASE_URL)
    setUsername('')
    setApiKey('')
    setConfigured(false)
    setShipmondoSaved(false)
    setSaveError('')
    setTest({ status: 'idle' })
  }

  async function testConnection() {
    setTest({ status: 'testing' })
    try {
      const result = await api<{ accountName: string; countryCode: string }>('/api/shipmondo/test-connection', { method: 'POST' })
      setTest({ status: 'ok', message: `Connected to ${result.accountName} (${result.countryCode}).` })
    } catch {
      setTest({ status: 'error', message: 'We could not connect to Shipmondo. Check the username and API key, then try again.' })
    }
  }

  async function savePin() {
    setPinError('')
    setPinSaved(false)
    const real = await getSettingsPin()
    if (currentPin !== real) {
      setPinError('The current code is incorrect.')
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('The new code must be exactly 4 digits.')
      return
    }
    await setSettingsPin(newPin)
    setCurrentPin('')
    setNewPin('')
    setPinSaved(true)
  }

  const shipmondoValid = baseUrl.trim().length > 0 && username.trim().length > 0 && apiKey.trim().length > 0

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-10">
        <Text className="text-xl font-extrabold text-ink" accessibilityRole="header">
          Settings
        </Text>

        <View className="gap-3 rounded-md border border-line bg-white p-4">
          <View className="flex-row items-center gap-2">
            <Cloud size={20} color="#075985" />
            <Text className="text-lg font-bold text-ink">Shipmondo account</Text>
          </View>
          <Text className="text-sm text-muted">
            {configured ? 'Connected. This tablet books through its own Shipmondo account.' : 'Not set up yet. Bookings use the app’s default account until this is configured.'}
          </Text>
          <TextField label="API base URL" placeholder="https://app.shipmondo.com/api/public/v3" autoCapitalize="none" autoCorrect={false} value={baseUrl} onChangeText={setBaseUrl} />
          <TextField label="API username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
          <TextField label="API key" autoCapitalize="none" autoCorrect={false} secureTextEntry value={apiKey} onChangeText={setApiKey} />
          {shipmondoSaved && <Text className="text-sm font-semibold text-success">Saved.</Text>}
          {saveError ? <Text className="text-sm font-medium text-error">{saveError}</Text> : null}
          <View className="flex-row flex-wrap gap-2.5">
            <View className="min-w-[120px] flex-1">
              <Button label="Save" onPress={saveShipmondo} loading={savingShipmondo} disabled={!shipmondoValid} />
            </View>
            {configured && (
              <View className="min-w-[120px] flex-1">
                <Button label="Test connection" variant="secondary" onPress={testConnection} loading={test.status === 'testing'} />
              </View>
            )}
            {configured && (
              <View className="min-w-[120px] flex-1">
                <Button label="Remove" variant="destructive" onPress={removeShipmondo} />
              </View>
            )}
          </View>
          {test.status === 'testing' && <Text className="text-sm text-muted">Checking the connection to Shipmondo…</Text>}
          {test.status === 'ok' && <Text className="text-sm font-semibold text-success">{test.message}</Text>}
          {test.status === 'error' && <Text className="text-sm font-medium text-error">{test.message}</Text>}
        </View>

        <View className="gap-3 rounded-md border border-line bg-white p-4">
          <View className="flex-row items-center gap-2">
            <KeyRound size={20} color="#075985" />
            <Text className="text-lg font-bold text-ink">Settings code</Text>
          </View>
          <Text className="text-sm text-muted">The 4-digit code needed to open Settings from the booking screen.</Text>
          <TextField label="Current code" keyboardType="number-pad" secureTextEntry maxLength={4} value={currentPin} onChangeText={(v) => setCurrentPin(v.replace(/[^0-9]/g, ''))} />
          <TextField label="New code" keyboardType="number-pad" secureTextEntry maxLength={4} value={newPin} onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, ''))} />
          {pinError ? <Text className="text-sm font-medium text-error">{pinError}</Text> : null}
          {pinSaved && <Text className="text-sm font-semibold text-success">Code updated.</Text>}
          <Button label="Update code" onPress={savePin} disabled={currentPin.length !== 4 || newPin.length !== 4} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
