import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

type Variant = 'primary' | 'secondary' | 'neutral' | 'destructive'

type Props = PressableProps & {
  label: string
  variant?: Variant
  loading?: boolean
}

// Primary is the one main next action on a screen; the rest step down in weight so there's never
// more than one obvious thing to press. Min height keeps every button comfortably touchable on a
// counter tablet.
const containerClass: Record<Variant, string> = {
  primary: 'bg-ocean active:bg-green-dark',
  secondary: 'bg-white border border-line active:bg-cream',
  neutral: 'bg-cream border border-line active:bg-line',
  destructive: 'bg-white border border-error active:bg-error-bg',
}

const labelClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  neutral: 'text-ink',
  destructive: 'text-error',
}

export function Button({ label, variant = 'primary', loading, disabled, accessibilityLabel, ...rest }: Props) {
  const inactive = disabled || loading
  return (
    <Pressable
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={`min-h-[52px] flex-row items-center justify-center rounded-md px-6 ${containerClass[variant]} ${inactive ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#075985'} />
      ) : (
        <Text className={`text-base font-semibold ${labelClass[variant]}`}>{label}</Text>
      )}
    </Pressable>
  )
}
