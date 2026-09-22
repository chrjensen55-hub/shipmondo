import { useState } from 'react'
import { Redirect } from 'expo-router'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { ApiError, useAuth } from '@/lib/auth-context'
import { colors } from '@/lib/theme'

export default function Login() {
  const { status, login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'signedIn') return <Redirect href="/send" />

  async function submit() {
    setLoading(true)
    setError('')
    try {
      await login(identifier, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>P</Text>
        </View>
        <Text style={styles.title}>Pak &amp; Send</Text>
        <Text style={styles.subtitle}>Staff sign-in</Text>
        <View style={styles.fields}>
          <TextField label="Username or email" autoCapitalize="none" autoCorrect={false} value={identifier} onChangeText={setIdentifier} />
          <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Sign in" onPress={submit} loading={loading} disabled={!identifier || !password} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 18, padding: 28, gap: 14, borderWidth: 1, borderColor: colors.line },
  brandMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.ocean, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  brandMarkText: { color: colors.white, fontWeight: '800', fontSize: 22 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 6 },
  fields: { gap: 12 },
  error: { color: colors.error, fontSize: 13, textAlign: 'center' },
})
