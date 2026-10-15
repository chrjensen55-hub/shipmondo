import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Delete } from 'lucide-react-native'
import { KIOSK_EXIT_CODE, lockoutSecondsLeft, recordRightCode, recordWrongCode } from '@/lib/kiosk'
import { useLang } from '@/lib/i18n'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export function KioskCodeDialog({ visible, title, onCancel, onSuccess }: { visible: boolean; title: string; onCancel: () => void; onSuccess: () => void }) {
  const tr = useLang()
  const [entered, setEntered] = useState('')
  const [wrong, setWrong] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => lockoutSecondsLeft())

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setSecondsLeft(lockoutSecondsLeft()), 500)
    return () => clearInterval(id)
  }, [visible])

  const locked = secondsLeft > 0

  function press(key: string) {
    if (locked || key === '') return
    if (key === 'back') {
      setEntered((v) => v.slice(0, -1))
      setWrong(false)
      return
    }
    const next = (entered + key).slice(0, KIOSK_EXIT_CODE.length)
    setWrong(false)
    if (next.length < KIOSK_EXIT_CODE.length) {
      setEntered(next)
      return
    }
    setEntered('')
    if (next === KIOSK_EXIT_CODE) {
      recordRightCode()
      onSuccess()
      return
    }
    recordWrongCode()
    setWrong(true)
    setSecondsLeft(lockoutSecondsLeft())
  }

  function cancel() {
    setEntered('')
    setWrong(false)
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View className="flex-1 items-center justify-center bg-ink/50 p-6">
        <View className="w-full max-w-xs gap-4 rounded-md bg-white p-6" accessibilityViewIsModal>
          <Text className="text-center text-xl font-bold text-ink" accessibilityRole="header">
            {title}
          </Text>
          <View className="flex-row justify-center gap-3 py-1">
            {Array.from({ length: KIOSK_EXIT_CODE.length }).map((_, i) => (
              <View key={i} className={`h-4 w-4 rounded-full border-2 ${i < entered.length ? 'border-ocean bg-ocean' : 'border-line bg-white'}`} />
            ))}
          </View>
          <Text className={`min-h-[20px] text-center text-sm font-medium ${locked || wrong ? 'text-error' : 'text-muted'}`} accessibilityRole="alert">
            {locked ? tr.kioskLocked.replace('{s}', String(secondsLeft)) : wrong ? tr.kioskWrongCode : ''}
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {KEYS.map((key, i) =>
              key === '' ? (
                <View key={i} className="h-14 w-[31%]" />
              ) : (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={key === 'back' ? tr.remove : key}
                  disabled={locked}
                  onPress={() => press(key)}
                  className={`h-14 w-[31%] items-center justify-center rounded-md border border-line bg-white active:bg-cream ${locked ? 'opacity-40' : ''}`}
                >
                  {key === 'back' ? <Delete size={22} color="#0F1E33" /> : <Text className="text-2xl font-semibold text-ink">{key}</Text>}
                </Pressable>
              ),
            )}
          </View>
          <Pressable accessibilityRole="button" onPress={cancel} className="min-h-[48px] items-center justify-center rounded-[10px] border border-line bg-white active:bg-cream">
            <Text className="text-base font-medium text-ink">{tr.cancelAction}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
