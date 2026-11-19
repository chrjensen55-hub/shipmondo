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

// While a button is working it keeps its pressed colour, so it reads as "tapped, please wait".
const busyClass: Record<Variant, string> = {
  primary: 'bg-green-dark',
  secondary: 'bg-cream border border-line',
  neutral: 'bg-line border border-line',
  destructive: 'bg-error-bg border border-error',
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
  const base = `${sizeClass[size]} flex-row items-center justify-center gap-2.5 rounded-[10px]`
  // Disabled uses a solid, deliberately muted fill rather than a translucent variant color — reads
  // clearly as "not available right now" instead of a dimmed version of the action.
  const className = loading ? `${base} ${busyClass[variant]}` : disabled ? `${base} bg-disabled` : `${base} ${containerClass[variant]}`
  return (
    <Pressable
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={className}
      {...rest}
    >
      {/* The spinner sits beside the label, so the button still says what it is doing. */}
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : '#0B4F82'} /> : null}
      <Text className={`flex-shrink text-center ${labelSizeClass[size]} ${disabled && !loading ? 'text-white' : labelClass[variant]}`}>{label}</Text>
    </Pressable>
  )
}
