import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { colors, radius } from '@/lib/theme'

type Props = PressableProps & {
  label: string
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={isPrimary ? colors.white : colors.green} /> : <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  primary: { backgroundColor: colors.ocean },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  disabled: { opacity: 0.6 },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  secondaryText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
})
