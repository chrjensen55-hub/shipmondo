import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { colors } from '@/lib/theme'

// Mirrors the web app's src/components/carrier-logo.tsx - same source images, ported into
// assets/images so they're bundled with the native app instead of fetched from a public/ folder.
// require() (not import) is the standard Expo/React Native pattern for static image assets -
// Metro statically analyzes these calls to bundle the file; plain `import` would need ambient
// module declarations for every image extension that this project doesn't have set up.
/* eslint-disable @typescript-eslint/no-require-imports */
const CARRIER_LOGOS: Record<string, ImageSourcePropType> = {
  DAO: require('../../assets/images/carrier-dao.png'),
  Bring: require('../../assets/images/carrier-bring.png'),
  PostNord: require('../../assets/images/carrier-postnord.jpg'),
  GLS: require('../../assets/images/carrier-gls.png'),
}
/* eslint-enable @typescript-eslint/no-require-imports */

export function CarrierLogo({ name, size = 48 }: { name: string; size?: number }) {
  const src = CARRIER_LOGOS[name]
  if (!src) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Text style={styles.fallbackText}>{name}</Text>
      </View>
    )
  }
  return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" alt={name} />
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
})
