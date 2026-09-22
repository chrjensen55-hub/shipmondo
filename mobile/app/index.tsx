import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { colors } from '@/lib/theme'

export default function Index() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.ocean} />
      </View>
    )
  }

  return <Redirect href={status === 'signedIn' ? '/send' : '/login'} />
}
