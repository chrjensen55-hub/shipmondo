import { Modal, Pressable, Text, View } from 'react-native'
import { Button } from './Button'

// Centered confirmation for actions that discard in-progress work. Dismissing with Cancel or the
// back button leaves everything as it was. Buttons carry their own labels so the caller decides
// the wording (e.g. "Cancel" / "Refresh").
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-ink/40 p-6" onPress={onCancel} accessibilityRole="none">
        <Pressable className="w-full max-w-md gap-4 rounded-lg bg-white p-6" onPress={(e) => e.stopPropagation()} accessibilityViewIsModal accessibilityRole="alert">
          <Text className="text-xl font-extrabold text-ink" accessibilityRole="header">
            {title}
          </Text>
          <Text className="text-base text-muted">{message}</Text>
          <View className="mt-2 flex-row gap-3">
            <View className="flex-1">
              <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <Button label={confirmLabel} variant="destructive" onPress={onConfirm} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
