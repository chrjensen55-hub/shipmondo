import { memo, type ReactNode } from 'react'
import { Image, Text, View, type ImageSourcePropType, type ScrollViewProps } from 'react-native'
import { useIsFocused, useRouter } from 'expo-router'
import { Button } from './Button'
import { KeyboardAwareScreen } from './KeyboardAwareScreen'
import { StepProgress } from './StepProgress'
import { useLang } from '@/lib/i18n'
import { CONTENT_MAX_WIDTH } from '@/lib/layout'
import { useTapOnce } from '@/lib/useTapOnce'

type Props = ScrollViewProps & {
  title: string
  subtitle?: string
  step?: number
  icon?: ImageSourcePropType
  // More than one picture beside the heading (the parcel step shows weight and size).
  icons?: ImageSourcePropType[]
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  // One short line above the buttons that says what is still needed while Continue is disabled.
  continueHint?: string
  error?: string
  hideBack?: boolean
  children: React.ReactNode
}

// Keeps what it last drew while its page is out of sight, and draws again when the page is shown.
const WhileOnScreen = memo(
  function WhileOnScreen({ children }: { onScreen: boolean; children: ReactNode }) {
    return children
  },
  (before, after) => !before.onScreen && !after.onScreen,
)

// Shared frame for every wizard step: progress at the top, one clear heading with a grey subtitle,
// the step's content, and a fixed action bar with Back (secondary) and a wider Continue (primary).
// The frame keeps the action bar and the focused field above the on-screen keyboard.
//
// The earlier steps stay open behind the current one and share its data. Without the wrapper here
// every letter typed on step 5 also redrew steps 1-4, which made typing and step changes slow.
export function WizardScreen(props: Props) {
  const onScreen = useIsFocused()
  return (
    <WhileOnScreen onScreen={onScreen}>
      <WizardFrame {...props} />
    </WhileOnScreen>
  )
}

function WizardFrame({ title, subtitle, step, icon, icons, onContinue, continueLabel, continueDisabled, continueLoading, continueHint, error, hideBack, children, ...scrollProps }: Props) {
  const router = useRouter()
  const tr = useLang()
  // Back and Continue show a spinner the moment they are tapped, and a second tap does nothing.
  const tap = useTapOnce()
  const showBack = !hideBack && router.canGoBack()
  const continuing = tap.busy === 'continue' || !!continueLoading
  const pictures = icons ?? (icon ? [icon] : [])
  const footer =
    showBack || onContinue ? (
      <View className="border-t border-line bg-white px-6 pb-4 pt-3">
        <View className={`w-full ${CONTENT_MAX_WIDTH} gap-2 self-center`}>
          {continueDisabled && !continuing && continueHint ? <Text className="text-center text-sm text-muted">{continueHint}</Text> : null}
          <View className="flex-row items-center gap-3">
            <View className="flex-[2]">
              {showBack ? <Button label={tr.backAction} variant="secondary" size="lg" onPress={() => tap.run('back', () => router.back())} loading={tap.busy === 'back'} /> : null}
            </View>
            <View className="flex-[3]">
              {onContinue ? (
                <Button label={continueLabel ?? tr.continueAction} size="lg" onPress={() => tap.run('continue', onContinue)} disabled={continueDisabled} loading={continuing} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    ) : null

  return (
    <KeyboardAwareScreen footer={footer} contentContainerClassName="px-6 pb-8 pt-20" {...scrollProps}>
      <View className={`w-full ${CONTENT_MAX_WIDTH} gap-4 self-center`}>
        {step ? <StepProgress step={step} /> : null}
        <View className="gap-3 sm:flex-row sm:items-center sm:gap-4">
          {pictures.length > 0 && (
            <View className="flex-row justify-center gap-3">
              {pictures.map((source, i) => (
                <Image key={i} source={source} resizeMode="contain" className="h-16 w-16" alt="" />
              ))}
            </View>
          )}
          <View className="gap-1 sm:flex-1">
            <Text className="text-2xl font-bold text-ink sm:text-3xl" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text className="text-sm text-muted sm:text-base">{subtitle}</Text> : null}
          </View>
        </View>
        {children}
        {error ? (
          <View className="rounded-sm bg-error-bg p-3.5">
            <Text className="text-sm font-medium text-error" accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    </KeyboardAwareScreen>
  )
}
