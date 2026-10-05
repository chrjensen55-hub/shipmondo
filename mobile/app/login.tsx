import { useState } from 'react'
import { Redirect } from 'expo-router'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { ApiError, useAuth } from '@/lib/auth-context'

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
      setError(err instanceof ApiError && err.status === 401 ? 'Wrong username or password. Please try again.' : 'We could not sign you in. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 items-center justify-center bg-cream p-5" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="w-full max-w-sm gap-4 rounded-lg border border-line bg-white p-7">
        <View className="h-12 w-12 items-center justify-center self-center rounded-xl bg-ocean">
          <Text className="text-2xl font-extrabold text-white">P</Text>
        </View>
        <Text className="text-center text-xl font-extrabold text-ink" accessibilityRole="header">
          Pak &amp; Send
        </Text>
        <Text className="-mt-2 text-center text-base text-muted">Staff sign-in</Text>
        <View className="gap-3">
          <TextField label="Username or email" autoCapitalize="none" autoCorrect={false} value={identifier} onChangeText={setIdentifier} />
          <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        </View>
        {error ? (
          <View className="rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
        <Button label="Sign in" onPress={submit} loading={loading} disabled={!identifier || !password} />
      </View>
    </KeyboardAvoidingView>
  )
}
