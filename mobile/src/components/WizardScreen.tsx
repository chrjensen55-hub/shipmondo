import { ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Button } from './Button'
import { StepProgress } from './StepProgress'
import { colors } from '@/lib/theme'

type Props = ScrollViewProps & {
  title: string
  subtitle?: string
  step?: number
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  error?: string
  hideBack?: boolean
  children: React.ReactNode
}

export function WizardScreen({ title, subtitle, step, onContinue, continueLabel = 'Continue', continueDisabled, continueLoading, error, hideBack, children, ...scrollProps }: Props) {
  const router = useRouter()
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        {step ? <StepProgress step={step} /> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>
        {!hideBack && router.canGoBack() ? <Button label="Back" variant="secondary" onPress={() => router.back()} /> : <View />}
        {onContinue ? <Button label={continueLabel} onPress={onContinue} disabled={continueDisabled} loading={continueLoading} /> : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: -10 },
  error: { color: colors.error, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
})
