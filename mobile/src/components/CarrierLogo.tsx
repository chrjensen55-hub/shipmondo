import { Image, Text, View, type ImageSourcePropType } from 'react-native'

// Same source images as the web app's carrier logo, bundled with the native app. require() (not
// import) is the standard Expo/React Native pattern for static image assets - Metro statically
// analyzes these calls to bundle the file.
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
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Text className="text-xs font-bold text-ink">{name}</Text>
      </View>
    )
  }
  return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" alt={name} />
}
