import { Modal, Pressable, Text, View } from 'react-native'
import { Button } from './Button'

// Centered message with a single OK button, styled like ConfirmDialog.
export function InfoDialog({ visible, title, message, okLabel, onClose }: { visible: boolean; title: string; message: string; okLabel: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-ink/40 p-6" onPress={onClose} accessibilityRole="none">
        <Pressable className="w-full max-w-md gap-4 rounded-lg bg-white p-6" onPress={(e) => e.stopPropagation()} accessibilityViewIsModal accessibilityRole="alert">
          <Text className="text-xl font-extrabold text-ink" accessibilityRole="header">
            {title}
          </Text>
          <Text className="text-base text-muted">{message}</Text>
          <View className="mt-2">
            <Button label={okLabel} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
