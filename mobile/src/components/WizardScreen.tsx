import { Image, Text, View, type ImageSourcePropType, type ScrollViewProps } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from './Button'
import { KeyboardAwareScreen } from './KeyboardAwareScreen'
import { StepProgress } from './StepProgress'
import { useLang } from '@/lib/i18n'

type Props = ScrollViewProps & {
  title: string
  subtitle?: string
  step?: number
  icon?: ImageSourcePropType
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  error?: string
  hideBack?: boolean
  children: React.ReactNode
}

// Shared frame for every wizard step: progress at the top, one clear heading with a grey subtitle,
// the step's content, and a fixed action bar with Back (secondary) and a wider Continue (primary).
// The frame keeps the action bar and the focused field above the on-screen keyboard.
export function WizardScreen({ title, subtitle, step, icon, onContinue, continueLabel, continueDisabled, continueLoading, error, hideBack, children, ...scrollProps }: Props) {
  const router = useRouter()
  const tr = useLang()
  const showBack = !hideBack && router.canGoBack()
  const footer =
    showBack || onContinue ? (
      <View className="flex-row items-center gap-3 border-t border-line bg-white px-6 py-4">
        <View className="flex-[2]">{showBack ? <Button label={tr.backAction} variant="secondary" onPress={() => router.back()} /> : null}</View>
        <View className="flex-[3]">
          {onContinue ? <Button label={continueLabel ?? tr.continueAction} onPress={onContinue} disabled={continueDisabled} loading={continueLoading} /> : null}
        </View>
      </View>
    ) : null

  return (
    <KeyboardAwareScreen footer={footer} contentContainerClassName="gap-4 px-6 pb-8 pt-20" {...scrollProps}>
      {step ? <StepProgress step={step} /> : null}
      {icon ? <Image source={icon} resizeMode="contain" className="h-20 w-20 self-center" alt="" /> : null}
      <View className="gap-1">
        <Text className="text-2xl font-bold text-ink" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
      </View>
      {children}
      {error ? (
        <View className="rounded-sm bg-error-bg p-3.5">
          <Text className="text-sm font-medium text-error" accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : null}
    </KeyboardAwareScreen>
  )
}
