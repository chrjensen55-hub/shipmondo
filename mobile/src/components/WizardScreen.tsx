import { Image, ScrollView, Text, View, type ImageSourcePropType, type ScrollViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Button } from './Button'
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

// Shared frame for every wizard step: progress at the top, an optional hero icon, one clear
// heading, the step's content, and a single action bar with Back (secondary) and Continue
// (primary) so the next move is always the most obvious thing on the screen.
export function WizardScreen({ title, subtitle, step, icon, onContinue, continueLabel, continueDisabled, continueLoading, error, hideBack, children, ...scrollProps }: Props) {
  const router = useRouter()
  const tr = useLang()
  const showBack = !hideBack && router.canGoBack()
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-8 pb-10 pt-16" {...scrollProps}>
        {step ? <StepProgress step={step} /> : null}
        {icon ? <Image source={icon} resizeMode="contain" className="h-20 w-20 self-center" alt="" /> : null}
        <Text className="text-[28px] font-semibold text-ink" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="-mt-4 text-base text-body">{subtitle}</Text> : null}
        {children}
        {error ? (
          <View className="rounded-sm bg-error-bg p-3.5">
            <Text className="text-sm font-medium text-error" accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      {showBack || onContinue ? (
        <View className="flex-row items-center justify-between gap-3 border-t border-line bg-white p-5">
          <View className="flex-1">{showBack ? <Button label={tr.backAction} variant="secondary" onPress={() => router.back()} /> : null}</View>
          <View className="flex-1">
            {onContinue ? <Button label={continueLabel ?? tr.continueAction} onPress={onContinue} disabled={continueDisabled} loading={continueLoading} /> : null}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}
