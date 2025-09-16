'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { createToast } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import { Flex, Box, Text, Button, Card, Badge, Table, TextField, IconButton, Dialog, Tabs, Select } from "@radix-ui/themes"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft"
import { Pencil } from "@phosphor-icons/react/dist/ssr/Pencil"
import { Check } from "@phosphor-icons/react/dist/ssr/Check"
import { X } from "@phosphor-icons/react/dist/ssr/X"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye"
import { EyeSlash } from "@phosphor-icons/react/dist/ssr/EyeSlash"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { House } from "@phosphor-icons/react/dist/ssr/House"
import { ListBullets } from "@phosphor-icons/react/dist/ssr/ListBullets"
import { Gear } from "@phosphor-icons/react/dist/ssr/Gear"
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash"
import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight"
import { Cpu } from "@phosphor-icons/react/dist/ssr/Cpu"
import { DashboardLayout } from "@/components/DashboardLayout"
import { TransferModal } from '@/components/TransferModal'
import { EmptyState } from '@/components/EmptyState'

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
  const { showToast } = useToast()

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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Card management state
  const [cards, setCards] = useState<any[]>([])
  const [showCreateCardDialog, setShowCreateCardDialog] = useState(false)
  const [showEditCardDialog, setShowEditCardDialog] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [cardForm, setCardForm] = useState({
    cardholderName: ''
  })
  const [loadingCards, setLoadingCards] = useState(false)
  const [savingCard, setSavingCard] = useState(false)

  useEffect(() => {
    fetchAccount()
  }, [accountId])

  useEffect(() => {
    if (activeTab === 'cards') {
      fetchCards()
    }
  }, [activeTab, accountId])

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
      case 'TRANSFER': return 'Transfer'
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
    console.log('🔄 Starting deposit process:', { amount, depositAmount, accountId })
    
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount)
      setError('Please enter a valid amount')
      return
    }

    try {
      setDepositing(true)
      setError(null)
      console.log('🔐 Getting auth session...')
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 Session check:', { hasSession: !!session, hasToken: !!session?.access_token })
      
      if (!session?.access_token) {
        console.error('❌ No authentication token found')
        setError('No authentication token found')
        return
      }

      const requestBody = {
        amount: amount,
        type: 'DEPOSIT'
      }
      console.log('📤 Making API request:', {
        url: `/api/accounts/${accountId}/transactions`,
        method: 'POST',
        body: requestBody,
        hasAuthHeader: true
      })

      const response = await fetch(`/api/accounts/${accountId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ API error response:', errorData)
        throw new Error(`Failed to process deposit: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Deposit successful:', data)
      
      // Update account with new balance
      setAccount(prev => prev ? { ...prev, balance: data.account.balance } : null)
      console.log('💰 Updated account balance:', data.account.balance)
      
      // Reset form and close dialog
      setDepositAmount('')
      setShowDepositDialog(false)
      
      // Refresh account data to get updated transactions
      console.log('🔄 Refreshing account data...')
      fetchAccount()
      
    } catch (err) {
      console.error('❌ Error processing deposit:', err)
      setError(`Failed to process deposit: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDepositing(false)
      console.log('🏁 Deposit process completed')
    }
  }

  const handleDeleteAccount = async () => {
    if (!account || deleteConfirmation !== account.nickname) {
      return
    }

    try {
      setDeleting(true)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No authentication token found')
        setError('No authentication token found')
        return
      }

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        // Account deleted successfully, navigate back to accounts list
        router.push('/accounts')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(`Failed to delete account: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmation('')
    }
  }

  // Card management functions
  const fetchCards = async () => {
    try {
      setLoadingCards(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/cards', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cards')
      }

      const data = await response.json()
      setCards(data.cards || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
      showToast(createToast.error('Error', 'Failed to load cards'))
    } finally {
      setLoadingCards(false)
    }
  }

  const handleCreateCard = async () => {
    try {
      setSavingCard(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          accountId: accountId,
          cardholderName: cardForm.cardholderName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create card')
      }

      const data = await response.json()
      setCards(prev => [data.card, ...prev])
      setShowCreateCardDialog(false)
      setCardForm({ cardholderName: '' })
      showToast(createToast.success('Card Issued', 'Virtual card has been issued successfully with 4-year expiration'))
    } catch (err) {
      console.error('Error creating card:', err)
      showToast(createToast.error('Error', err instanceof Error ? err.message : 'Failed to create card'))
    } finally {
      setSavingCard(false)
    }
  }

  const handleUpdateCard = async () => {
    if (!selectedCard) return

    try {
      setSavingCard(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/cards/${selectedCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardholderName: cardForm.cardholderName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update card')
      }

      const data = await response.json()
      setCards(prev => prev.map(card => card.id === selectedCard.id ? data.card : card))
      setShowEditCardDialog(false)
      setSelectedCard(null)
      setCardForm({ cardholderName: '' })
      showToast(createToast.success('Card Updated', 'Card has been updated successfully'))
    } catch (err) {
      console.error('Error updating card:', err)
      showToast(createToast.error('Error', err instanceof Error ? err.message : 'Failed to update card'))
    } finally {
      setSavingCard(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete card')
      }

      setCards(prev => prev.filter(card => card.id !== cardId))
      showToast(createToast.success('Card Deleted', 'Card has been deleted successfully'))
    } catch (err) {
      console.error('Error deleting card:', err)
      showToast(createToast.error('Error', err instanceof Error ? err.message : 'Failed to delete card'))
    }
  }

  const openEditCardDialog = (card: any) => {
    setSelectedCard(card)
    setCardForm({
      cardholderName: card.cardholderName
    })
    setShowEditCardDialog(true)
  }

  const closeCardDialogs = () => {
    setShowCreateCardDialog(false)
    setShowEditCardDialog(false)
    setSelectedCard(null)
    setCardForm({ cardholderName: '' })
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
        Deposit
      </Button>
      <Button 
        variant="soft"
        onClick={() => setShowTransferModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <ArrowsLeftRight size={16} />
        Transfer
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
      subtitle={`••••••••${account.accountNumber.slice(-4)}`}
      breadcrumb={{
        label: "Accounts",
        href: "/accounts"
      }}
      action={actionButtons}
    >
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="dashboard">
            <Flex align="center" gap="2">
              <House size={16} />
              Dashboard
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="transactions">
            <Flex align="center" gap="2">
              <ListBullets size={16} />
              Transactions
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="cards">
            <Flex align="center" gap="2">
              <CreditCard size={16} />
              Card Management
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="settings">
            <Flex align="center" gap="2">
              <Gear size={16} />
              Settings
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="dashboard">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
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
              <EmptyState
                icon={<ListBullets size={48} />}
                title="No transactions yet"
                description="Transactions will appear here once you start making deposits, transfers, or payments."
              />
            )}
          </Box>
        </Card>
          </Flex>
          </Box>
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
              <Text size="4" weight="bold">Transaction History</Text>

              {account.transactions && account.transactions.length > 0 ? (
                <Card>
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.RowHeaderCell>Date</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Type</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Amount</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Status</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Method</Table.RowHeaderCell>
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
                              {transaction.card && `Card ${transaction.card.cardNumber.slice(-4)}`}
                              {transaction.check && `Check to ${transaction.check.recipient.name}`}
                              {!transaction.card && !transaction.check && '—'}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Card>
              ) : (
                <EmptyState
                  icon={<ListBullets size={48} />}
                  title="No transactions yet"
                  description="Your complete transaction history will be displayed here. Make your first transaction to get started."
                />
              )}
            </Flex>
          </Box>
        </Tabs.Content>

        <Tabs.Content value="cards">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
            <Flex justify="between" align="center">
              <Text size="4" weight="bold">Card Management</Text>
              <Button
                onClick={() => setShowCreateCardDialog(true)}
                style={{ cursor: 'pointer' }}
              >
                <Plus size={16} />
                Issue Card
              </Button>
            </Flex>

            {loadingCards ? (
              <Text color="gray">Loading cards...</Text>
            ) : cards.length === 0 ? (
              <EmptyState
                icon={<CreditCard size={48} />}
                title="No cards yet"
                description="Issue your first virtual card to get started with card management."
              />
            ) : (
              <Flex direction="column" gap="4">
                {cards.map(card => (
                  <Box key={card.id} style={{ position: 'relative' }}>
                    {/* Debit Card Design */}
                    <Box
                      style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        color: '#212529',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '200px',
                        aspectRatio: '1.586', // Standard credit card ratio
                        maxWidth: '400px'
                      }}
                    >
                      {/* Card Background Pattern */}
                      <Box
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'radial-gradient(circle at 20% 80%, rgba(0, 212, 170, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 212, 170, 0.03) 0%, transparent 50%)',
                          borderRadius: '16px'
                        }}
                      />

                      {/* Top Row - Logo */}
                      <Flex justify="start" align="center" style={{ position: 'relative', zIndex: 1, marginBottom: '20px' }}>
                        <img 
                          src="/images/gloo-impact-logo-light.svg" 
                          alt="Gloo Impact" 
                          style={{ 
                            height: '24px',
                            width: 'auto'
                          }} 
                        />
                      </Flex>

                      {/* Chip Icon - Left Side, Vertically Centered */}
                      <Box
                        style={{
                          position: 'absolute',
                          left: '24px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1
                        }}
                      >
                        <Box
                          style={{
                            width: '40px',
                            height: '30px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Cpu size={20} color="#6b7280" />
                        </Box>
                      </Box>

                      {/* Card Number */}
                      <Box style={{ position: 'relative', zIndex: 1, marginBottom: '16px' }}>
                        <Text
                          size="5"
                          weight="bold"
                          style={{
                            fontFamily: 'monospace',
                            letterSpacing: '2px',
                            fontSize: '18px',
                            color: '#374151'
                          }}
                        >
                          {card.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                        </Text>
                      </Box>

                      {/* Bottom Row - Cardholder and Visa */}
                      <Flex justify="between" align="end" style={{ position: 'relative', zIndex: 1 }}>
                        <Box>
                          <Text size="2" weight="medium" style={{ color: '#374151', fontSize: '13px' }}>
                            {card.cardholderName}
                          </Text>
                        </Box>
                        <Flex direction="column" align="end">
                          <Text size="1" style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>
                            Debit
                          </Text>
                          <Text size="4" weight="bold" style={{ color: '#1e40af', fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px' }}>
                            VISA
                          </Text>
                        </Flex>
                      </Flex>

                      {/* Status Badge */}
                      <Box style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}>
                        <Badge
                          color={card.isActive ? 'green' : 'gray'}
                          variant="soft"
                          style={{ 
                            backgroundColor: card.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)', 
                            color: card.isActive ? '#16a34a' : '#6b7280',
                            fontSize: '11px'
                          }}
                        >
                          {card.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Box>
                    </Box>

                    {/* Action Buttons Below Card */}
                    <Flex justify="end" align="center" style={{ marginTop: '12px' }}>
                      <Flex gap="2">
                        <IconButton
                          variant="ghost"
                          size="1"
                          onClick={() => openEditCardDialog(card)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="1"
                          color="red"
                          onClick={() => handleDeleteCard(card.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Trash size={14} />
                        </IconButton>
                      </Flex>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            )}
          </Flex>
          </Box>
        </Tabs.Content>

        <Tabs.Content value="settings">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
            {/* Account Settings */}
            <Card>
              <Box style={{ padding: 24 }}>
                <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan', marginBottom: '16px', display: 'block' }}>
                  Account Settings
                </Text>
                
                <Flex direction="column" gap="4">
                  <Box>
                    <Text as="label" size="3" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                      Account Name
                    </Text>
                    <Flex gap="2">
                      <TextField.Root
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter account name"
                        style={{ flex: 1 }}
                      />
                      <Button 
                        onClick={handleSaveName}
                        disabled={saving || !editedName.trim() || editedName === account.nickname}
                        variant="soft"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </Flex>
                  </Box>

                  <Box>
                    <Text size="3" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                      Account Number
                    </Text>
                    <Flex align="center" gap="2">
                      <Text size="3" color="gray" style={{ 
                        fontFamily: 'monospace',
                        minWidth: '110px',
                        letterSpacing: '1px'
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
                    </Flex>
                  </Box>

                </Flex>
              </Box>
            </Card>

            {/* Danger Zone */}
            <Card style={{ borderColor: 'var(--red-6)' }}>
              <Box style={{ padding: 24 }}>
                <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan', marginBottom: '8px', display: 'block', color: 'var(--red-11)' }}>
                  Danger Zone
                </Text>
                <Text size="3" color="gray" style={{ marginBottom: '16px', display: 'block' }}>
                  Once you delete an account, there is no going back. Please be certain.
                </Text>
                
                <Button 
                  variant="soft"
                  color="red"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={Number(account.balance) !== 0}
                  style={{ cursor: Number(account.balance) !== 0 ? 'not-allowed' : 'pointer' }}
                >
                  <Trash size={16} />
                  {Number(account.balance) !== 0 ? 'Cannot Delete (Balance Not Zero)' : 'Delete Account'}
                </Button>
                
                {Number(account.balance) !== 0 && (
                  <Text size="2" color="gray" style={{ marginTop: '8px', display: 'block' }}>
                    Account must have a zero balance before it can be deleted.
                  </Text>
                )}
              </Box>
            </Card>
          </Flex>
          </Box>
        </Tabs.Content>
      </Tabs.Root>

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

      {/* Delete Account Dialog */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title style={{ color: 'var(--red-11)' }}>Delete Account</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            This action cannot be undone. This will permanently delete the account "{account.nickname}" and remove all associated data.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <Text size="2" weight="bold">
              Please type <Text style={{ fontFamily: 'monospace', backgroundColor: 'var(--gray-3)', padding: '2px 4px', borderRadius: '4px' }}>{account.nickname}</Text> to confirm:
            </Text>
            
            <TextField.Root
              placeholder={`Type "${account.nickname}" here`}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deleteConfirmation === account.nickname) {
                  handleDeleteAccount()
                }
              }}
            />

            {error && (
              <Text size="2" color="red">
                {error}
              </Text>
            )}

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" onClick={() => {
                  setDeleteConfirmation('')
                  setError(null)
                }}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button 
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== account.nickname}
                color="red"
                style={{ 
                  cursor: deleteConfirmation !== account.nickname ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash size={16} />
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Create Card Dialog */}
      <Dialog.Root open={showCreateCardDialog} onOpenChange={closeCardDialogs}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Issue Virtual Card</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Issue a new virtual card to someone. A random card number will be generated.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Cardholder Name
              </Text>
              <TextField.Root
                placeholder="John Doe"
                value={cardForm.cardholderName}
                onChange={(e) => setCardForm(prev => ({ ...prev, cardholderName: e.target.value }))}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleCreateCard}
              disabled={savingCard || !cardForm.cardholderName}
              loading={savingCard}
            >
              Issue Card
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit Card Dialog */}
      <Dialog.Root open={showEditCardDialog} onOpenChange={closeCardDialogs}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Edit Card</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Update card information for {selectedCard?.cardholderName}.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Cardholder Name
              </Text>
              <TextField.Root
                placeholder="John Doe"
                value={cardForm.cardholderName}
                onChange={(e) => setCardForm(prev => ({ ...prev, cardholderName: e.target.value }))}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleUpdateCard}
              disabled={savingCard || !cardForm.cardholderName}
              loading={savingCard}
            >
              Update Card
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        preselectedFromAccountId={accountId}
        onTransferComplete={fetchAccount}
      />
    </DashboardLayout>
  )
}
