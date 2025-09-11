'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Flex, Box, Text, Button, Card, Badge, Table, TextField, IconButton, Dialog } from "@radix-ui/themes"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft"
import { Pencil } from "@phosphor-icons/react/dist/ssr/Pencil"
import { Check } from "@phosphor-icons/react/dist/ssr/Check"
import { X } from "@phosphor-icons/react/dist/ssr/X"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye"
import { EyeSlash } from "@phosphor-icons/react/dist/ssr/EyeSlash"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { DashboardLayout } from "@/components/DashboardLayout"

interface Account {
  id: string
  nickname: string
  accountNumber: string
  balance: number
  createdAt: string
  updatedAt: string
  transactions?: Transaction[]
  cards?: Card[]
  _count?: {
    transactions: number
    cards: number
  }
}

interface Transaction {
  id: string
  amount: number
  type: string
  status: string
  createdAt: string
  card?: Card
  check?: {
    id: string
    recipient: {
      name: string
    }
  }
}

interface Card {
  id: string
  cardNumber: string
  cardholderName: string
  isActive: boolean
}

export default function AccountPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)

  useEffect(() => {
    fetchAccount()
  }, [accountId])

  const fetchAccount = async () => {
    try {
      setLoading(true)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(`/api/accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Account not found')
        } else {
          setError('Failed to load account')
        }
        return
      }

      const data = await response.json()
      setAccount(data.account)
      setEditedName(data.account.nickname)
    } catch (err) {
      console.error('Error fetching account:', err)
      setError('Failed to load account')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === account?.nickname) {
      setIsEditingName(false)
      return
    }

    try {
      setSaving(true)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nickname: editedName.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update account')
      }

      const data = await response.json()
      setAccount(data.account)
      setIsEditingName(false)
    } catch (err) {
      console.error('Error updating account:', err)
      setError('Failed to update account name')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'Deposit'
      case 'WITHDRAWAL': return 'Withdrawal'
      case 'CHECK_PAYMENT': return 'Check Payment'
      case 'CARD_PAYMENT': return 'Card Payment'
      default: return type
    }
  }

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber
    // Add spacing between asterisks and pad to match full number width
    const lastFour = accountNumber.slice(-4)
    const maskedPart = '* * * *'
    return `${maskedPart}${lastFour}`
  }

  const toggleAccountNumberVisibility = () => {
    setShowFullAccountNumber(!showFullAccountNumber)
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      setDepositing(true)
      setError(null)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(`/api/accounts/${accountId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: amount,
          type: 'DEPOSIT'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process deposit')
      }

      const data = await response.json()
      
      // Update account with new balance
      setAccount(prev => prev ? { ...prev, balance: data.account.balance } : null)
      
      // Reset form and close dialog
      setDepositAmount('')
      setShowDepositDialog(false)
      
      // Refresh account data to get updated transactions
      fetchAccount()
      
    } catch (err) {
      console.error('Error processing deposit:', err)
      setError('Failed to process deposit')
    } finally {
      setDepositing(false)
    }
  }

  const actionButtons = (
    <Flex gap="2">
      <Button 
        onClick={() => setShowDepositDialog(true)}
        style={{ 
          backgroundColor: 'var(--accent-9)',
          cursor: 'pointer'
        }}
      >
        <Plus size={16} />
        Deposit Funds
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => router.push('/accounts')}
        style={{ cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to Accounts
      </Button>
    </Flex>
  )

  const backButton = (
    <Button 
      variant="ghost" 
      onClick={() => router.push('/accounts')}
      style={{ cursor: 'pointer' }}
    >
      <ArrowLeft size={16} />
      Back to Accounts
    </Button>
  )

  if (loading) {
    return (
      <DashboardLayout title="Loading..." action={backButton}>
        <Text>Loading account details...</Text>
      </DashboardLayout>
    )
  }

  if (error || !account) {
    return (
      <DashboardLayout title="Error" action={backButton}>
        <Card style={{ padding: 20, textAlign: 'center' }}>
          <Text color="red">{error || 'Account not found'}</Text>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title={account.nickname}
      subtitle={
        <Flex align="center" gap="2">
          <Text size="4" color="gray">
            Account 
          </Text>
          <Text size="4" color="gray" style={{ 
            fontFamily: 'monospace',
            minWidth: '110px',
            letterSpacing: '1px',
            display: 'inline-block'
          }}>
            {showFullAccountNumber ? account.accountNumber : maskAccountNumber(account.accountNumber)}
          </Text>
          <IconButton 
            variant="ghost" 
            size="1"
            onClick={toggleAccountNumberVisibility}
            style={{ cursor: 'pointer' }}
          >
            {showFullAccountNumber ? <EyeSlash size={14} /> : <Eye size={14} />}
          </IconButton>
          <Text size="4" color="gray">
            • Created {formatDate(account.createdAt)}
          </Text>
        </Flex>
      }
      action={actionButtons}
    >
      <Flex direction="column" gap="6">
        {/* Account Name Editing */}
        <Card>
          <Box style={{ padding: 16 }}>
            <Flex align="center" gap="3">
              <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan' }}>
                Account Name:
              </Text>
              {isEditingName ? (
                <Flex align="center" gap="2">
                  <TextField.Root
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Account name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') {
                        setEditedName(account.nickname)
                        setIsEditingName(false)
                      }
                    }}
                  />
                  <IconButton 
                    variant="ghost" 
                    onClick={handleSaveName}
                    disabled={saving}
                    style={{ cursor: 'pointer' }}
                  >
                    <Check size={16} />
                  </IconButton>
                  <IconButton 
                    variant="ghost" 
                    onClick={() => {
                      setEditedName(account.nickname)
                      setIsEditingName(false)
                    }}
                    disabled={saving}
                    style={{ cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </IconButton>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <Text size="3">{account.nickname}</Text>
                  <IconButton 
                    variant="ghost" 
                    onClick={() => setIsEditingName(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Pencil size={16} />
                  </IconButton>
                </Flex>
              )}
            </Flex>
          </Box>
        </Card>
        {/* Account Overview */}
        <Flex gap="4" wrap="wrap">
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Current Balance</Text>
              <Text size="6" weight="bold" style={{ 
                fontFamily: 'F37Jan',
                color: account.balance >= 0 ? 'var(--green-11)' : 'var(--red-11)'
              }}>
                {formatCurrency(account.balance)}
              </Text>
            </Flex>
          </Card>
          
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Total Transactions</Text>
              <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>
                {account._count?.transactions || 0}
              </Text>
            </Flex>
          </Card>
          
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Active Cards</Text>
              <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>
                {account._count?.cards || 0}
              </Text>
            </Flex>
          </Card>
        </Flex>

        {/* Recent Transactions */}
        <Card>
          <Box style={{ padding: 16 }}>
            <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', marginBottom: 16 }}>
              Recent Transactions
            </Text>
            
            {account.transactions && account.transactions.length > 0 ? (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {account.transactions.map((transaction) => (
                    <Table.Row key={transaction.id}>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {formatDate(transaction.createdAt)}
                        </Text>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <Text size="3">
                          {getTransactionTypeLabel(transaction.type)}
                        </Text>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <Text 
                          size="3" 
                          weight="medium" 
                          style={{ 
                            color: transaction.amount > 0 ? 'var(--green-11)' : 'var(--red-11)'
                          }}
                        >
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </Text>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <Badge 
                          color={
                            transaction.status === 'CLEARED' ? 'green' : 
                            transaction.status === 'DECLINED' ? 'red' : 'orange'
                          }
                          variant="soft"
                        >
                          {transaction.status.toLowerCase()}
                        </Badge>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {transaction.card && `Card ${transaction.card.cardNumber}`}
                          {transaction.check && `Check to ${transaction.check.recipient.name}`}
                          {!transaction.card && !transaction.check && '—'}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Box style={{ textAlign: 'center', padding: 40 }}>
                <CreditCard size={32} color="var(--gray-9)" style={{ marginBottom: 16 }} />
                <Text size="3" color="gray">
                  No transactions yet
                </Text>
              </Box>
            )}
          </Box>
        </Card>
      </Flex>

      {/* Deposit Dialog */}
      <Dialog.Root open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Deposit Funds</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Add funds to your {account.nickname} account via ACH deposit.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Amount
              </Text>
              <TextField.Root
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button 
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              style={{ backgroundColor: 'var(--accent-9)' }}
            >
              {depositing ? 'Processing...' : 'Deposit Funds'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </DashboardLayout>
  )
}
