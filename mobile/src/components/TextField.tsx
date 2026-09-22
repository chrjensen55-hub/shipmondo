import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, radius } from '@/lib/theme'

type Props = TextInputProps & { label: string }

export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={colors.muted} {...rest} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 16, color: colors.ink, backgroundColor: colors.white },
})
