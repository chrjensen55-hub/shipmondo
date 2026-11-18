import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

type Variant = 'primary' | 'secondary' | 'neutral' | 'destructive'
type Size = 'md' | 'lg'

type Props = PressableProps & {
  label: string
  variant?: Variant
  // lg is for the main action bar and other single, important actions on a counter tablet.
  size?: Size
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

const sizeClass: Record<Size, string> = {
  md: 'min-h-[48px] px-6',
  lg: 'min-h-[54px] px-6',
}

const labelSizeClass: Record<Size, string> = {
  md: 'text-base font-medium',
  lg: 'text-lg font-semibold',
}

export function Button({ label, variant = 'primary', size = 'md', loading, disabled, accessibilityLabel, ...rest }: Props) {
  const inactive = disabled || loading
  const base = `${sizeClass[size]} flex-row items-center justify-center rounded-[10px]`
  // Disabled uses a solid, deliberately muted fill rather than a translucent variant color — reads
  // clearly as "not available right now" instead of a dimmed version of the action.
  const className = disabled && !loading ? `${base} bg-disabled` : `${base} ${containerClass[variant]} ${loading ? 'opacity-70' : ''}`
  return (
    <Pressable
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={className}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#0B4F82'} />
      ) : (
        <Text className={`text-center ${labelSizeClass[size]} ${disabled ? 'text-white' : labelClass[variant]}`}>{label}</Text>
      )}
    </Pressable>
  )
}
