'use client'

import { useState, useEffect } from 'react'
import { Dialog, Flex, Box, Text, Button, TextField, Select } from "@radix-ui/themes"
import { ArrowsLeftRight, ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr"
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { createToast } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'

interface Account {
  id: string
  nickname: string
  accountNumber: string
  balance: number
}

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedFromAccountId?: string
  onTransferComplete?: () => void
}

export function TransferModal({ 
  isOpen, 
  onClose, 
  preselectedFromAccountId,
  onTransferComplete 
}: TransferModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [fromAccountId, setFromAccountId] = useState(preselectedFromAccountId || '')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const { showToast } = useToast()

  // Switch from and to accounts
  const switchAccounts = () => {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return
    setFromAccountId(toAccountId)
    setToAccountId(fromAccountId)
  }

  // Fetch user accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      console.error('❌ Error fetching accounts:', err)
      showToast(createToast.error('Error', 'Failed to load accounts'))
    } finally {
      setLoading(false)
    }
  }

  // Load accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
    }
  }, [isOpen])

  // Update from account when preselected changes
  useEffect(() => {
    if (preselectedFromAccountId) {
      setFromAccountId(preselectedFromAccountId)
    }
  }, [preselectedFromAccountId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFromAccountId(preselectedFromAccountId || '')
      setToAccountId('')
      setAmount('')
    }
  }, [isOpen, preselectedFromAccountId])

  const fromAccount = accounts.find(account => account.id === fromAccountId)
  const toAccount = accounts.find(account => account.id === toAccountId)
  const availableBalance = fromAccount ? fromAccount.balance : 0
  const transferAmount = parseFloat(amount) || 0

  const canTransfer = 
    fromAccountId && 
    toAccountId && 
    fromAccountId !== toAccountId && 
    transferAmount > 0 && 
    transferAmount <= availableBalance

  const handleTransfer = async () => {
    if (!canTransfer) return

    try {
      setTransferring(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/accounts/${fromAccountId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          toAccountId,
          amount: transferAmount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to process transfer: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Show success toast
      showToast(createToast.success(
        'Transfer Completed!', 
        `Successfully transferred $${amount} from ${data.fromAccount.nickname} to ${data.toAccount.nickname}`
      ))
      
      // Close modal and refresh data
      onClose()
      if (onTransferComplete) {
        onTransferComplete()
      }
      
    } catch (err) {
      console.error('❌ Error processing transfer:', err)
      showToast(createToast.error(
        'Transfer Failed', 
        err instanceof Error ? err.message : 'Unknown error occurred'
      ))
    } finally {
      setTransferring(false)
    }
  }


  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber
    return '••••••••' + accountNumber.slice(-4)
  }

  return (
      <>
        <style dangerouslySetInnerHTML={{
          __html: `
            .transfer-select-trigger .rt-SelectTriggerInner {
              width: 100% !important;
            }
          `
        }} />
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Content style={{ maxWidth: '500px' }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <ArrowsLeftRight size={20} />
              Transfer Funds
            </Flex>
          </Dialog.Title>
        
        <Dialog.Description size="2" color="gray">
          Transfer money between your accounts
        </Dialog.Description>

        <Flex direction="column" gap="4" style={{ marginTop: '20px' }}>
          {/* From Account Selection */}
          <Box>
            <Text as="label" size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
              From Account
            </Text>
            <Select.Root 
              value={fromAccountId} 
              onValueChange={setFromAccountId}
              disabled={loading}
            >
              <Select.Trigger 
                placeholder="Select source account" 
                style={{ 
                  width: '100%'
                }} 
                className="transfer-select-trigger"
              />
              <Select.Content>
                {accounts.map(account => (
                  <Select.Item key={account.id} value={account.id} style={{ padding: '8px 12px' }}>
                    <Flex justify="between" align="center" style={{ minWidth: '320px', width: '100%' }}>
                      <Flex align="center" gap="2">
                        <Text weight="medium" size="2">{account.nickname}</Text>
                        <Text size="1" color="gray">
                          {maskAccountNumber(account.accountNumber)}
                        </Text>
                      </Flex>
                      <Text size="2" weight="medium" color="green" style={{ marginLeft: 'auto' }}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </Flex>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            {fromAccount && (
              <Text size="1" color="gray" style={{ marginTop: '4px' }}>
                Available: {formatCurrency(fromAccount.balance)}
              </Text>
            )}
          </Box>

          {/* Switch Accounts Button */}
          <Flex justify="center" style={{ margin: '8px 0' }}>
            <Button
              variant="ghost"
              size="1"
              onClick={switchAccounts}
              disabled={!fromAccountId || !toAccountId || fromAccountId === toAccountId || loading}
              style={{
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flex direction="column" style={{ lineHeight: '1' }}>
                <ArrowUp size={10} />
                <ArrowDown size={10} />
              </Flex>
            </Button>
          </Flex>

          {/* To Account Selection */}
          <Box>
            <Text as="label" size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
              To Account
            </Text>
            <Select.Root 
              value={toAccountId} 
              onValueChange={setToAccountId}
              disabled={loading || !fromAccountId}
            >
              <Select.Trigger 
                placeholder="Select destination account" 
                style={{ 
                  width: '100%'
                }} 
                className="transfer-select-trigger"
              />
              <Select.Content>
                {accounts
                  .filter(account => account.id !== fromAccountId)
                  .map(account => (
                    <Select.Item key={account.id} value={account.id} style={{ padding: '8px 12px' }}>
                      <Flex justify="between" align="center" style={{ minWidth: '320px', width: '100%' }}>
                        <Flex align="center" gap="2">
                          <Text weight="medium" size="2">{account.nickname}</Text>
                          <Text size="1" color="gray">
                            {maskAccountNumber(account.accountNumber)}
                          </Text>
                        </Flex>
                        <Text size="2" weight="medium" color="green" style={{ marginLeft: 'auto' }}>
                          {formatCurrency(account.balance)}
                        </Text>
                      </Flex>
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select.Root>
          </Box>

          {/* Amount Input */}
          <Box>
            <Text as="label" size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
              Amount
            </Text>
            <TextField.Root
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              disabled={!fromAccountId || !toAccountId}
            >
              <TextField.Slot side="left">$</TextField.Slot>
            </TextField.Root>
            {fromAccount && transferAmount > availableBalance && (
              <Text size="1" color="red" style={{ marginTop: '4px' }}>
                Insufficient funds. Maximum: {formatCurrency(availableBalance)}
              </Text>
            )}
            {fromAccount && transferAmount > 0 && transferAmount <= availableBalance && (
              <Text size="1" color="green" style={{ marginTop: '4px' }}>
                New balance: {formatCurrency(availableBalance - transferAmount)}
              </Text>
            )}
          </Box>

          {/* Transfer Summary */}
          {fromAccount && toAccount && transferAmount > 0 && (
            <Box 
              style={{ 
                padding: '12px', 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: '8px',
                border: '1px solid var(--gray-6)'
              }}
            >
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Transfer Summary
              </Text>
              <Flex direction="column" gap="1">
                <Flex justify="between">
                  <Text size="1" color="gray">From:</Text>
                  <Text size="1">{fromAccount.nickname}</Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">To:</Text>
                  <Text size="1">{toAccount.nickname}</Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">Amount:</Text>
                  <Text size="1" weight="medium">{formatCurrency(transferAmount)}</Text>
                </Flex>
              </Flex>
            </Box>
          )}
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button 
            onClick={handleTransfer}
            disabled={!canTransfer || transferring}
            loading={transferring}
            style={{ 
              backgroundColor: canTransfer ? 'var(--accent-9)' : undefined,
              cursor: canTransfer ? 'pointer' : 'not-allowed'
            }}
          >
            <ArrowsLeftRight size={16} />
            {transferring ? 'Processing...' : 'Transfer Funds'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
      </>
  )
}
