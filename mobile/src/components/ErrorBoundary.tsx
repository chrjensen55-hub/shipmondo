import { Component, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { Button } from './Button'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// A crash anywhere in the tree would otherwise leave a blank white screen with no way back short of
// force-closing, on a device that runs unattended all day. Staff get a plain message and a retry
// button; the technical error goes to the log only, never onto the screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled error caught by ErrorBoundary', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-white p-6">
          <TriangleAlert size={40} color="#a33b2e" />
          <Text className="text-center text-lg font-extrabold text-ink" accessibilityRole="header">
            Something went wrong
          </Text>
          <Text className="text-center text-base text-muted">Please try again. If it keeps happening, ask a staff member for help.</Text>
          <View className="w-full max-w-xs">
            <Button label="Try again" onPress={() => this.setState({ hasError: false })} />
          </View>
        </View>
      )
    }
    return this.props.children
  }
}
