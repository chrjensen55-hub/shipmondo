import { StyleSheet, Text, View } from 'react-native'
import { colors } from '@/lib/theme'

// A fixed 7-step scale (carrier, delivery, parcel, sender, recipient, customs, review) even
// though customs is skipped for domestic routes — skipping straight from step 5 to 7 still reads
// fine as forward progress and avoids recomputing the total per-route just for this bar.
const TOTAL_STEPS = 7

export function StepProgress({ step }: { step: number }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.segment, i < step && styles.segmentFilled]} />
        ))}
      </View>
      <Text style={styles.label}>
        Step {step} of {TOTAL_STEPS}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 4 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  segmentFilled: { backgroundColor: colors.ocean },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
})
