import { Component, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { Button } from './Button'
import { colors } from '@/lib/theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

// A crash anywhere in the tree otherwise takes down the whole app to a blank white screen with
// no way back short of force-closing — this at least gives staff a "something went wrong, try
// again" screen with a reset button, on a device that runs unattended all day.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled error caught by ErrorBoundary', error)
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen}>
          <TriangleAlert size={40} color={colors.error} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message || 'An unexpected error occurred.'}</Text>
          <Button label="Try again" onPress={() => this.setState({ error: null })} />
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: colors.white },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  message: { color: colors.muted, textAlign: 'center' },
})
