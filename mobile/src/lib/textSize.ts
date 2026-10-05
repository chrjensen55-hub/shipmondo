import * as SecureStore from 'expo-secure-store'
import { rem } from 'nativewind'

// Every text and spacing size in the app is written in rem, and NativeWind resolves rem from this
// one value. Setting it rescales all text and spacing at once, on every screen, without touching
// individual components.
export type TextSize = 'small' | 'normal' | 'large' | 'xlarge'

export const TEXT_SIZES: Record<TextSize, number> = {
  small: 13,
  normal: 14,
  large: 16,
  xlarge: 18,
}

const STORAGE_KEY = 'pak-send-text-size'
const DEFAULT_TEXT_SIZE: TextSize = 'normal'

export async function loadTextSize(): Promise<TextSize> {
  const saved = await SecureStore.getItemAsync(STORAGE_KEY)
  return saved === 'small' || saved === 'normal' || saved === 'large' || saved === 'xlarge' ? saved : DEFAULT_TEXT_SIZE
}

export async function saveTextSize(size: TextSize): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, size)
}

export function applyTextSize(size: TextSize): void {
  rem.set(TEXT_SIZES[size])
}
