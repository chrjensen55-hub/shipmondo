import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'

export default function Index() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#075985" />
      </View>
    )
  }

  return <Redirect href={status === 'signedIn' ? '/send' : '/login'} />
}
