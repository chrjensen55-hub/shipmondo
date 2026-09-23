import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Cloud, KeyRound } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { getShipmondoConfig, setShipmondoConfig, clearShipmondoConfig } from '@/lib/shipmondoConfig'
import { getSettingsPin, setSettingsPin } from '@/lib/settingsPin'
import { api, ApiError } from '@/lib/api'
import { colors, radius } from '@/lib/theme'

type TestState = { status: 'idle' | 'testing' | 'ok' | 'error'; message?: string }

// Every real deployment uses this same production endpoint — pre-filling it (rather than just
// showing it as a placeholder) removes the most common way staff broke a tablet's setup: leaving
// this field blank, or mistyping it, while the API username/key are the only part that actually
// differs between accounts.
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
      // Confirm the newly-saved credentials actually work against Shipmondo right away, instead
      // of staff only finding out at the print step that a typo'd key or wrong base URL meant
      // nothing was really booking.
      await testConnection()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save these settings on this device.')
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
    } catch (err) {
      setTest({ status: 'error', message: err instanceof ApiError ? err.message : 'Could not reach Shipmondo.' })
    }
  }

  async function savePin() {
    setPinError('')
    setPinSaved(false)
    const real = await getSettingsPin()
    if (currentPin !== real) {
      setPinError('Current code is incorrect.')
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('New code must be exactly 4 digits.')
      return
    }
    await setSettingsPin(newPin)
    setCurrentPin('')
    setNewPin('')
    setPinSaved(true)
  }

  const shipmondoValid = baseUrl.trim().length > 0 && username.trim().length > 0 && apiKey.trim().length > 0

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Cloud size={20} color={colors.ocean} />
            <Text style={styles.cardTitle}>Shipmondo account</Text>
          </View>
          <Text style={styles.cardSub}>{configured ? 'Connected — this tablet books through its own Shipmondo account.' : 'Not set up yet — bookings will use the app’s default account until this is configured.'}</Text>
          <TextField label="API base URL" placeholder="https://app.shipmondo.com/api/public/v3" autoCapitalize="none" autoCorrect={false} value={baseUrl} onChangeText={setBaseUrl} />
          <TextField label="API username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
          <TextField label="API key" autoCapitalize="none" autoCorrect={false} secureTextEntry value={apiKey} onChangeText={setApiKey} />
          {shipmondoSaved && <Text style={styles.success}>Saved.</Text>}
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <View style={styles.row}>
            <Button label="Save" onPress={saveShipmondo} loading={savingShipmondo} disabled={!shipmondoValid} />
            {configured && <Button label="Test connection" variant="secondary" onPress={testConnection} loading={test.status === 'testing'} />}
            {configured && <Button label="Remove" variant="secondary" onPress={removeShipmondo} />}
          </View>
          {test.status === 'testing' && <Text style={styles.cardSub}>Checking the connection to Shipmondo…</Text>}
          {test.status === 'ok' && <Text style={styles.success}>{test.message}</Text>}
          {test.status === 'error' && <Text style={styles.error}>Could not connect: {test.message}</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <KeyRound size={20} color={colors.ocean} />
            <Text style={styles.cardTitle}>Settings code</Text>
          </View>
          <Text style={styles.cardSub}>The 4-digit code needed to open Settings from the booking screen.</Text>
          <TextField label="Current code" keyboardType="number-pad" secureTextEntry maxLength={4} value={currentPin} onChangeText={(v) => setCurrentPin(v.replace(/[^0-9]/g, ''))} />
          <TextField label="New code" keyboardType="number-pad" secureTextEntry maxLength={4} value={newPin} onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, ''))} />
          {pinError ? <Text style={styles.error}>{pinError}</Text> : null}
          {pinSaved && <Text style={styles.success}>Code updated.</Text>}
          <Button label="Update code" onPress={savePin} disabled={currentPin.length !== 4 || newPin.length !== 4} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  cardSub: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  success: { color: colors.success },
  error: { color: colors.error },
})
