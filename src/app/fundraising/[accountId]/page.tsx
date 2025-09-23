'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Box, Card, Flex, Text, Button, Dialog, TextField, Heading, Progress, Badge } from '@radix-ui/themes'
import { formatCurrency } from '@/lib/utils'

export default function FundraiserPage() {
  const params = useParams()
  const accountId = params.accountId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [donateOpen, setDonateOpen] = useState(false)
  const [amount, setAmount] = useState('50')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [raised, setRaised] = useState<number>(0)
  const [donationCount, setDonationCount] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/accounts/${accountId}/fundraising`)
        const json = await res.json()
        setSettings(json.settings)
        setRaised(json.raised || 0)
        setDonationCount(Number(json.donationCount || 0))
      } catch (e) { setError('Failed to load') } finally { setLoading(false) }
    }
    load()
  }, [accountId])

  if (loading) return <Box p="6"><Text>Loading…</Text></Box>
  if (error || !settings) return <Box p="6"><Text>{error || 'Not found'}</Text></Box>
  if (!settings.enabled || settings.publishStatus !== 'PUBLIC') return <Box p="6"><Text>Fundraiser is not public.</Text></Box>

  const amt = Number(amount || 0)
  const matchedPreview = settings.matchingEnabled && settings.matchingPercent ? Math.round((amt * settings.matchingPercent) / 100) : 0
  const totalPreview = amt + matchedPreview
  const progressPercent = settings.goal ? Math.min(100, Math.round((raised / Number(settings.goal)) * 100)) : 0

  return (
    <Box p="6" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {settings.imageUrl && (
        <Box style={{ flex: '0 1 520px' }}>
          <img src={settings.imageUrl} alt="Fundraiser" style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: 12 }} />
        </Box>
      )}
      {/* Hero */}
      <Flex align="center" justify="between" wrap="wrap" gap="6" style={{ marginBottom: 20 }}>
        <Box style={{ flex: '1 1 520px' }}>
          <Heading size="8" style={{ fontFamily: 'F37Jan' }}>{settings.title}</Heading>
          <Text size="3" color="gray" style={{ display: 'block', marginTop: 6 }}>{settings.description}</Text>
          <Flex align="center" gap="3" style={{ marginTop: 14 }}>
            <Button onClick={() => setDonateOpen(true)} style={{ cursor: 'pointer' }}>Donate</Button>
          </Flex>
        </Box>
      </Flex>

      {/* Matching callout */}
      {settings.matchingEnabled && settings.matchingPercent ? (
        <Card style={{ marginBottom: 16 }}>
          <Box p="4">
            <Text size="4" weight="regular">
              This fundraiser includes a {settings.matchingPercent}% donor match. Every $1 you give becomes ${settings.matchingPercent / 100 + 1}, accelerating progress toward the goal.
            </Text>
          </Box>
        </Card>
      ) : null}

      {/* Stats Card */}
      <Card>
        <Box p="4">
          <Heading size="4" style={{ fontFamily: 'F37Jan', marginBottom: 12 }}>Total Donations</Heading>
          {settings.goal && (
            <>
              <Progress value={progressPercent} />
              <Flex justify="between" style={{ marginTop: 8 }}>
                <Text size="4" weight="bold">{formatCurrency(raised)}</Text>
                <Text size="2" color="gray">Goal {formatCurrency(Number(settings.goal))}</Text>
              </Flex>
            </>
          )}
          {(!settings.goal) && (
            <Text size="4" weight="bold">{formatCurrency(raised)}</Text>
          )}
          <Flex justify="between" wrap="wrap" gap="5" style={{ marginTop: 16 }}>
            <Box>
              <Text size="4" weight="bold">{donationCount}</Text> <Text size="2" color="gray">Donations</Text>
            </Box>
            {settings.matchingEnabled && settings.matchingPercent && (
              <Box>
                <Text size="2" color="gray">Matching</Text>
                <Text size="4" weight="bold">{settings.matchingPercent}%</Text>
              </Box>
            )}
          </Flex>
        </Box>
      </Card>

      <Dialog.Root open={donateOpen} onOpenChange={setDonateOpen}>
        <Dialog.Content style={{ maxWidth: 420 }}>
          {result && !result.error ? (
            <>
              <Dialog.Title>Thank you!</Dialog.Title>
              <Flex direction="column" gap="3" mt="3">
                <Text size="3">
                  {settings.thankYouMessage || 'Thank you for your donation to our campaign! Your support makes a difference.'}
                </Text>
                <Text size="2" color="green">
                  Donation {formatCurrency(Number(amount))}
                  {result.matching?.matchedAmount ? ` + match ${formatCurrency(result.matching.matchedAmount)} = total ${formatCurrency(Number(amount) + Number(result.matching.matchedAmount))}` : ''}
                  .
                </Text>
                <Flex justify="end" mt="2">
                  <Dialog.Close><Button>Close</Button></Dialog.Close>
                </Flex>
              </Flex>
            </>
          ) : (
            <>
              <Dialog.Title>Donate</Dialog.Title>
              <Flex direction="column" gap="3" mt="3">
                <TextField.Root type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
                {amt > 0 && (
                  <Text size="2" color="green">Your donation {formatCurrency(amt)} + match {formatCurrency(matchedPreview)} = total {formatCurrency(totalPreview)}.</Text>
                )}
              </Flex>
              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close><Button variant="soft" color="gray">Cancel</Button></Dialog.Close>
                <Button
                  onClick={async () => {
                    setProcessing(true)
                    setResult(null)
                    try {
                      const res = await fetch(`/api/fundraising/${accountId}/donate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount) }) })
                      const json = await res.json()
                      if (res.ok) setResult(json)
                      else setResult({ error: json.error || 'Failed' })
                    } finally { setProcessing(false) }
                  }}
                  disabled={processing || !amount}
                >{processing ? 'Processing…' : 'Submit Donation'}</Button>
              </Flex>
              {result && result.error && (
                <Box style={{ marginTop: 12 }}>
                  <Text color="red">{result.error}</Text>
                </Box>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  )
}


