'use client'

import { useEffect, useState } from 'react'
import { Box, Card, Flex, Text, Button, Badge } from '@radix-ui/themes'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${session?.access_token}` } })
    if (res.ok) {
      const json = await res.json()
      setItems(json.notifications || [])
      setUnread(json.unreadCount || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/notifications', { method: 'PUT', headers: { Authorization: `Bearer ${session?.access_token}` } })
    await load()
  }

  return (
    <DashboardLayout title="Notifications" action={<Button onClick={markAllRead} style={{ cursor: 'pointer' }} disabled={unread === 0}>Mark all read {unread ? `(${unread})` : ''}</Button>}>
      <Box style={{ paddingTop: 20 }}>
        {loading ? (
          <Text color="gray">Loading…</Text>
        ) : items.length === 0 ? (
          <Text color="gray">No notifications yet.</Text>
        ) : (
          <Flex direction="column" gap="3">
            {items.map(n => (
              <Card key={n.id} style={{ borderColor: 'var(--gray-6)' }}>
                <Box style={{ padding: 16 }}>
                  <Flex justify="between" align="center">
                    <Text size="3" weight="bold">{n.title}</Text>
                    <Flex align="center" gap="2">
                      {!n.isRead && <Badge color="blue" variant="soft">Unread</Badge>}
                      <Text size="2" color="gray">{new Date(n.createdAt).toLocaleString()}</Text>
                    </Flex>
                  </Flex>
                  <Text size="2" color="gray" style={{ display: 'block', marginTop: 8 }}>{n.description}</Text>
                </Box>
              </Card>
            ))}
          </Flex>
        )}
      </Box>
    </DashboardLayout>
  )
}


