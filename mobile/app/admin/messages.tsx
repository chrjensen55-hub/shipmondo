import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ActivityIndicator, Linking, Text, TextInput, View } from 'react-native'
import { ExternalLink, Lock, MessageSquare } from 'lucide-react-native'
import { AdminHeader } from '@/components/AdminHeader'
import { Button } from '@/components/Button'
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen'
import { ApiError } from '@/lib/api'
import { fetchThread, markThreadRead, sendReply, type CenterMessage } from '@/lib/center'
import { useCenter } from '@/lib/center-context'
import { useKiosk } from '@/lib/kiosk'
import { PADDED_MAX_WIDTH } from '@/lib/layout'
import { useLocations } from '@/lib/location-context'

const REFRESH_MS = 20_000

function timeLabel(ms: number) {
  return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Messages between head office and this tablet's location. Head office writes from the website's
// Message Center; a message can carry a link, shown here as a button (for example the download of
// a new app version). Staff answer in the box at the bottom.
export default function MessagesScreen() {
  const { activeLocation } = useLocations()
  const { clearUnread } = useCenter()
  const kiosk = useKiosk()
  const locationId = activeLocation.id
  const [messages, setMessages] = useState<CenterMessage[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [error, setError] = useState('')
  const [linkError, setLinkError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const sendingRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchThread(locationId)
      setMessages(data.messages)
      setConfigured(data.configured)
      setError('')
      // Seeing the thread counts as having read it.
      if (data.messages.some((m) => m.from === 'office')) await markThreadRead(locationId).catch(() => {})
      clearUnread()
    } catch (err) {
      // An older server without the Message Center answers 404: treat it like "not set up".
      if (err instanceof ApiError && err.status === 404) setConfigured(false)
      else setError('We could not load the messages. Check the internet connection and try again.')
      setMessages((current) => current ?? [])
    }
  }, [locationId, clearUnread])

  useFocusEffect(
    useCallback(() => {
      load()
      const timer = setInterval(load, REFRESH_MS)
      return () => clearInterval(timer)
    }, [load]),
  )

  async function openLink(url: string) {
    setLinkError('')
    try {
      await Linking.openURL(url)
    } catch {
      setLinkError('This link could not be opened on this tablet.')
    }
  }

  async function send() {
    const body = text.trim()
    if (!body || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setSendError('')
    try {
      const message = await sendReply(locationId, body)
      setMessages((current) => [...(current ?? []), message])
      setText('')
    } catch {
      setSendError('Your answer was not sent. Please try again.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const hasLinks = !!messages?.some((m) => m.link)
  const footer = configured ? (
    <View className="border-t border-line bg-white px-5 py-3">
      <View className={`w-full ${PADDED_MAX_WIDTH} gap-2 self-center`}>
        {sendError ? (
          <Text className="text-sm font-medium text-error" accessibilityRole="alert">
            {sendError}
          </Text>
        ) : null}
        <View className="flex-row items-end gap-3">
          <TextInput
            className="max-h-[120px] min-h-[48px] flex-1 rounded-[8px] border-[1.5px] border-line bg-white px-3.5 py-3 text-[15px] text-ink"
            placeholder="Write an answer to head office"
            placeholderTextColor="#6B7280"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            accessibilityLabel="Answer to head office"
          />
          <View className="w-28">
            <Button label="Send" onPress={send} loading={sending} disabled={!text.trim()} />
          </View>
        </View>
      </View>
    </View>
  ) : null

  return (
    <KeyboardAwareScreen footer={footer} contentContainerClassName="pb-6">
      <AdminHeader title="Messages" subtitle={`Between head office and ${activeLocation.name}`} />
      <View className={`w-full ${PADDED_MAX_WIDTH} gap-3 self-center px-5`}>
        {error ? (
          <View className="rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}

        {kiosk.active && hasLinks ? (
          <View className="flex-row items-center gap-2.5 rounded-sm bg-[#fff8e6] p-3">
            <Lock size={18} color="#8a5a00" />
            <Text className="flex-1 text-sm font-medium text-[#8a5a00]">The tablet is in kiosk mode. Turn kiosk mode off from the menu on the booking screen before you open a link or download.</Text>
          </View>
        ) : null}
        {linkError ? (
          <View className="rounded-sm bg-error-bg p-3">
            <Text className="text-center text-sm font-medium text-error" accessibilityRole="alert">
              {linkError}
            </Text>
          </View>
        ) : null}

        {messages === null ? <ActivityIndicator className="mt-10" size="large" color="#0B4F82" /> : null}

        {messages !== null && messages.length === 0 ? (
          <View className="mt-6 items-center gap-3 rounded-md border border-line bg-white p-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-mint">
              <MessageSquare size={24} color="#0B4F82" />
            </View>
            <Text className="text-center text-lg font-bold text-ink">{configured ? 'No messages yet' : 'Messages are not set up yet'}</Text>
            <Text className="text-center text-sm text-muted">{configured ? 'Messages from head office show up here, for example when a new app version is ready.' : 'Head office has not switched the Message Center on yet. Nothing needs to be done on this tablet.'}</Text>
          </View>
        ) : null}

        {messages?.map((m) =>
          m.from === 'office' ? (
            <View key={m.id} className="max-w-[92%] gap-2 self-start rounded-md border border-line bg-white p-4 sm:max-w-[80%]">
              <Text className="text-xs font-bold uppercase text-muted">Head office · {timeLabel(m.createdAt)}</Text>
              <Text className="text-base text-ink">{m.text}</Text>
              {m.link ? (
                <View className="mt-1 gap-1.5">
                  <Button label={m.link.label} size="lg" onPress={() => openLink(m.link!.url)} />
                  <View className="flex-row items-center gap-1.5">
                    <ExternalLink size={13} color="#6B7280" />
                    <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
                      {m.link.url}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View key={m.id} className="max-w-[92%] gap-1.5 self-end rounded-md bg-ocean p-4 sm:max-w-[80%]">
              <Text className="text-xs font-bold uppercase text-mint">You · {timeLabel(m.createdAt)}</Text>
              <Text className="text-base text-white">{m.text}</Text>
            </View>
          ),
        )}
      </View>
    </KeyboardAwareScreen>
  )
}
