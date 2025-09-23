'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { createToast } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import { Flex, Box, Text, Button, Card, Badge, Table, TextField, IconButton, Dialog, Tabs, Select, TextArea, Switch, Progress } from "@radix-ui/themes"
import { FileUpload } from '@/components/FileUpload'
import { AnalyticsStat } from '@/components/AnalyticsStat'
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft"
import { Pencil } from "@phosphor-icons/react/dist/ssr/Pencil"
import { Check } from "@phosphor-icons/react/dist/ssr/Check"
import { X } from "@phosphor-icons/react/dist/ssr/X"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { HandCoins } from "@phosphor-icons/react/dist/ssr/HandCoins"
import { House } from "@phosphor-icons/react/dist/ssr/House"
import { ListBullets } from "@phosphor-icons/react/dist/ssr/ListBullets"
import { Gear } from "@phosphor-icons/react/dist/ssr/Gear"
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash"
import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight"
import { Cpu } from "@phosphor-icons/react/dist/ssr/Cpu"
import { ShareNetwork } from "@phosphor-icons/react/dist/ssr/ShareNetwork"
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
  routingNumber?: string
  transactions?: Transaction[]
  cards?: Card[]
  _count?: {
    transactions: number
    cards: number
  }
}

interface Payee {
  id: string
  name: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  achAccountNumber?: string
  achRoutingNumber?: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  status: string
  createdAt: string
  groupRole?: string
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
  createdAt: string
  expiryMonth: number
  expiryYear: number
  dailyLimit?: number
  monthlyLimit?: number
  allowedCategories?: string[]
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
  // Removed account number visibility toggle from settings
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const initialTab = (searchParams?.get('tab') as string) || 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const noLastRowBorderClass = 'no-last-row-border'

  // Send Money state
  const [payees, setPayees] = useState<Payee[]>([])
  const [loadingPayees, setLoadingPayees] = useState(false)
  const [showPayeeDialog, setShowPayeeDialog] = useState(false)
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null)
  const [savingPayee, setSavingPayee] = useState(false)
  const [payeeForm, setPayeeForm] = useState<Partial<Payee>>({ name: '', country: 'US' })
  const [paymentMethod, setPaymentMethod] = useState<'ACH' | 'CHECK'>('ACH')
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentMemo, setPaymentMemo] = useState<string>('')
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [payments, setPayments] = useState<Transaction[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // Fundraising state (persisted per-account in localStorage)
  const [fundraisingEnabled, setFundraisingEnabled] = useState(false)
  const [fundraising, setFundraising] = useState<any>({
    page: {
      title: '',
      description: '',
      image: '',
      goal: '',
      publish: 'Unlisted', // Unlisted | Public
    },
    widgets: [] as Array<{ id: string, name: string }>,
    thankYou: 'Thank you for your donation to our campaign! Your support makes a difference.',
  })
  const [fundraisingInitialized, setFundraisingInitialized] = useState(false)
  const [userAccounts, setUserAccounts] = useState<Array<{ id: string, nickname: string }>>([])
  const [fundraisingStats, setFundraisingStats] = useState<{ donationTotal: number; donationCount: number; matchTotal: number; raised: number; balance: number }>({ donationTotal: 0, donationCount: 0, matchTotal: 0, raised: 0, balance: 0 })

  // Card management state
  const [cards, setCards] = useState<any[]>([])
  const [showCreateCardDialog, setShowCreateCardDialog] = useState(false)
  const [showEditCardDialog, setShowEditCardDialog] = useState(false)
  const [showShareCardDialog, setShowShareCardDialog] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    dailyLimit: '',
    monthlyLimit: '',
    allowedCategories: [] as string[]
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

  // Keep state in sync with tab query param (supports direct links / refresh)
  useEffect(() => {
    const urlTab = (searchParams?.get('tab') as string) || 'dashboard'
    if (urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'send') {
      fetchPayees()
      fetchPayments()
    }
  }, [activeTab])

  // Load fundraising settings from API
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch(`/api/accounts/${accountId}/fundraising`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const json = await res.json()
          const s = json.settings
          const widgets = json.widgets || []
          setFundraisingEnabled(!!s?.enabled)
          setFundraising((prev: any) => ({
            page: {
              title: s?.title || '',
              description: s?.description || '',
              image: s?.imageUrl || '',
              goal: s?.goal ?? '',
              publish: s?.publishStatus === 'PUBLIC' ? 'Public' : 'Unlisted',
            },
            widgets,
            thankYou: s?.thankYouMessage || prev.thankYou,
            matchingEnabled: !!s?.matchingEnabled,
            matchingPercent: s?.matchingPercent ?? '',
            matchingFromAccountId: s?.matchingFromAccountId || '',
          }))
          setFundraisingStats({
            donationTotal: Number(json.donationTotal || 0),
            donationCount: Number(json.donationCount || 0),
            matchTotal: Number(json.matchTotal || 0),
            raised: Number(json.raised || 0),
            balance: Number(json.balance || 0),
          })
          // load accounts for dropdown
          const accRes = await fetch('/api/accounts', { headers: { Authorization: `Bearer ${session.access_token}` } })
          if (accRes.ok) {
            const { accounts } = await accRes.json()
            setUserAccounts((accounts || []).map((a: any) => ({ id: a.id, nickname: a.nickname })))
          }
        }
      } finally {
        setFundraisingInitialized(true)
      }
    }
    load()
  }, [accountId])

  const addWidget = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/accounts/${accountId}/fundraising/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: `Widget ${fundraising.widgets.length + 1}` })
      })
      if (res.ok) {
        const { widget } = await res.json()
        setFundraising((prev: any) => ({ ...prev, widgets: [widget, ...prev.widgets] }))
      }
    } catch {}
  }

  const updateWidgetName = (id: string, name: string) => {
    setFundraising((prev: any) => ({
      ...prev,
      widgets: prev.widgets.map((w: any) => w.id === id ? { ...w, name } : w)
    }))
  }

  const removeWidget = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/accounts/${accountId}/fundraising/widgets?widgetId=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setFundraising((prev: any) => ({ ...prev, widgets: prev.widgets.filter((w: any) => w.id !== id) }))
      }
    } catch {}
  }

  const getEmbedCode = (widgetId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `<iframe src="${origin}/donate?accountId=${accountId}&widgetId=${widgetId}" width="100%" height="600" frameborder="0"></iframe>`
  }

  const copyEmbed = async (widgetId: string) => {
    try {
      await navigator.clipboard.writeText(getEmbedCode(widgetId))
      showToast(createToast.success('Copied', 'Embed code copied to clipboard'))
    } catch {
      showToast(createToast.error('Copy failed', 'Could not copy embed code'))
    }
  }

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

  const getTransactionTypeLabel = (type: string, groupRole?: string) => {
    if (type === 'TRANSFER' && (groupRole === 'MATCH_DEBIT' || groupRole === 'MATCH_CREDIT')) {
      return 'Donation Match'
    }
    switch (type) {
      case 'DEPOSIT': return 'Deposit'
      case 'WITHDRAWAL': return 'Withdrawal'
      case 'TRANSFER': return 'Transfer'
      case 'CHECK_PAYMENT': return 'Check Payment'
      case 'CARD_PAYMENT': return 'Card Payment'
      case 'ACH_PAYMENT': return 'ACH Payment'
      case 'DONATION': return 'Donation'
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

  // Removed account number visibility toggle

  // Compute running balances for the visible transactions (descending order)
  const runningBalanceById = (() => {
    const map = new Map<string, number>()
    if (!account?.transactions) return map
    let running = Number(account.balance || 0)
    for (const tx of account.transactions) {
      map.set(tx.id, running)
      running -= Number((tx as any).amount)
    }
    return map
  })()
  
  const fetchPayees = async () => {
    try {
      setLoadingPayees(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/payees', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        const json = await res.json()
        setPayees(json.payees || [])
      }
    } finally {
      setLoadingPayees(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/accounts/${accountId}/transactions?typeIn=ACH_PAYMENT,CHECK_PAYMENT&limit=25`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const json = await res.json()
        setPayments(json.transactions || [])
      }
    } finally {
      setLoadingPayments(false)
    }
  }

  const savePayee = async () => {
    if (!payeeForm.name || !payeeForm.name.trim()) {
      showToast(createToast.error('Name required', 'Please enter a payee name.'))
      return
    }
    try {
      setSavingPayee(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const isEdit = !!editingPayeeId
      const url = isEdit ? `/api/payees/${editingPayeeId}` : '/api/payees'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payeeForm)
      })
      if (res.ok) {
        const { payee } = await res.json()
        setPayees(prev => isEdit ? prev.map(p => p.id === payee.id ? payee : p) : [payee, ...prev])
        setShowPayeeDialog(false)
        setPayeeForm({ name: '', country: 'US' })
        setEditingPayeeId(null)
        showToast(createToast.success(isEdit ? 'Payee updated' : 'Payee added', isEdit ? 'Payee updated successfully.' : 'Payee created successfully.'))
      } else {
        showToast(createToast.error('Failed', 'Could not save payee.'))
      }
    } finally {
      setSavingPayee(false)
    }
  }

  const deletePayee = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/payees/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        setPayees(prev => prev.filter(p => p.id !== id))
        if (selectedPayeeId === id) setSelectedPayeeId('')
        showToast(createToast.success('Deleted', 'Payee deleted.'))
      } else {
        showToast(createToast.error('Failed', 'Could not delete payee.'))
      }
    } catch {}
  }

  const submitPayment = async () => {
    const amt = parseFloat(paymentAmount)
    if (!selectedPayeeId) {
      showToast(createToast.error('Select payee', 'Please choose a payee.'))
      return
    }
    if (!amt || amt <= 0) {
      showToast(createToast.error('Enter amount', 'Please enter a valid amount.'))
      return
    }
    try {
      setSubmittingPayment(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/accounts/${accountId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ method: paymentMethod, payeeId: selectedPayeeId, amount: amt, memo: paymentMemo })
      })
      if (res.ok) {
        showToast(createToast.success('Payment sent', 'Your payment was submitted.'))
        setPaymentAmount('')
        setPaymentMemo('')
        await fetchAccount()
      } else {
        const t = await res.json().catch(() => ({}))
        showToast(createToast.error('Failed', t.error || 'Could not submit payment.'))
      }
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Aggregate total paid by payee for this account (from loaded payments)
  const totalPaidByPayeeId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of payments as any[]) {
      const pid = (tx.payeeId as string) || tx.payee?.id || tx.check?.payee?.id
      if (!pid) continue
      const amt = Math.abs(Number(tx.amount || 0))
      map[pid] = (map[pid] || 0) + amt
    }
    return map
  }, [payments])

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
          cardholderName: cardForm.cardholderName,
          dailyLimit: cardForm.dailyLimit ? parseFloat(cardForm.dailyLimit as any) : null,
          monthlyLimit: cardForm.monthlyLimit ? parseFloat(cardForm.monthlyLimit as any) : null,
          allowedCategories: cardForm.allowedCategories
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create card')
      }

      const data = await response.json()
      setCards(prev => [data.card, ...prev])
      setShowCreateCardDialog(false)
      setCardForm({ cardholderName: '', dailyLimit: '', monthlyLimit: '', allowedCategories: [] })
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
          cardholderName: cardForm.cardholderName,
          dailyLimit: cardForm.dailyLimit ? parseFloat(cardForm.dailyLimit as any) : null,
          monthlyLimit: cardForm.monthlyLimit ? parseFloat(cardForm.monthlyLimit as any) : null,
          allowedCategories: cardForm.allowedCategories
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
      setCardForm({ cardholderName: '', dailyLimit: '', monthlyLimit: '', allowedCategories: [] })
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
      cardholderName: card.cardholderName,
      dailyLimit: card.dailyLimit ? String(card.dailyLimit) : '',
      monthlyLimit: card.monthlyLimit ? String(card.monthlyLimit) : '',
      allowedCategories: Array.isArray(card.allowedCategories) ? card.allowedCategories : []
    })
    setShowEditCardDialog(true)
  }

  const closeCardDialogs = () => {
    setShowCreateCardDialog(false)
    setShowEditCardDialog(false)
    setSelectedCard(null)
    setCardForm({ cardholderName: '', dailyLimit: '', monthlyLimit: '', allowedCategories: [] })
  }


  const actionButtons = (
    <Flex align="center" gap="3">
      <Text size="6" weight="bold">{formatCurrency(account?.balance || 0)}</Text>
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
      subtitle={(
        <Flex align="center" gap="3">
          {/* Last four of account number */}
          <Text size="4" color="gray" style={{ fontFamily: 'monospace' }}>****{account.accountNumber.slice(-4)}</Text>
        </Flex>
      )}
      breadcrumb={{
        label: "Accounts",
        href: "/accounts"
      }}
      action={actionButtons}
    >
      <Tabs.Root value={activeTab} onValueChange={(v) => {
        setActiveTab(v)
        const sp = new URLSearchParams(Array.from(searchParams?.entries?.() || []))
        sp.set('tab', v)
        window.history.replaceState(null, '', `${pathname}?${sp.toString()}`)
      }}>
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
          <Tabs.Trigger value="send">
            <Flex align="center" gap="2">
              <ArrowsLeftRight size={16} />
              Send Money
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="fundraising">
            <Flex align="center" gap="2">
              <HandCoins size={16} />
              Fundraising
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
              {fundraisingEnabled && (
                <Card>
                  <Box style={{ padding: 16 }}>
                    <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Fundraising</Text>
                    <Flex gap="4" wrap="wrap">
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Donation Count" value={`${fundraisingStats.donationCount}`} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Donations" value={formatCurrency(fundraisingStats.donationTotal)} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Matches" value={formatCurrency(fundraisingStats.matchTotal)} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Raised" value={formatCurrency(fundraisingStats.raised)} />
                      </Box>
                    </Flex>
                    {!!fundraising.page.goal && Number(fundraising.page.goal) > 0 && (
                      <Box style={{ marginTop: 16 }}>
                        <Text size="2" color="gray" style={{ display: 'block', marginBottom: 6 }}>Progress toward goal ({formatCurrency(Number(fundraising.page.goal))})</Text>
                        <Progress value={Math.min(100, Math.round((fundraisingStats.raised / Number(fundraising.page.goal)) * 100))} />
                      </Box>
                    )}
                  </Box>
                </Card>
              )}
              {/* Main content with right sidebar */}
              <Flex gap="4" align="start" wrap="wrap">
                {/* Recent Transactions (main) */}
                <Box style={{ flex: '2 1 600px' }}>
                  <Card>
                    <Box style={{ padding: 16 }}>
                      <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', marginBottom: 16 }}>
                        Recent Transactions
                      </Text>
                      {account.transactions && account.transactions.length > 0 ? (
                        <Table.Root className={noLastRowBorderClass as any}>
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                              <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                              <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {account.transactions.slice(0, 5).map((transaction) => (
                              <Table.Row key={transaction.id}>
                                <Table.Cell>
                                  <Text size="2" color="gray">{formatDate(transaction.createdAt)}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="3">{getTransactionTypeLabel(transaction.type, (transaction as any).groupRole)}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="3" weight="medium" style={{ color: transaction.amount > 0 ? 'var(--green-11)' : 'var(--red-11)' }}>
                                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                  </Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="3" weight="medium">{formatCurrency(runningBalanceById.get(transaction.id) || 0)}</Text>
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
                </Box>

                {/* Right sidebar: Account details */}
                <Box style={{ flex: '1 1 280px', minWidth: '280px' }}>
                  <Card>
                    <Box style={{ padding: 16 }}>
                      <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Account Details</Text>
                      <Flex direction="column" gap="3">
                        <Box>
                          <Text size="2" color="gray">Account Name: </Text>
                          <Text size="3" weight="medium">{account.nickname}</Text>
                        </Box>

                        <Box>
                          <Text size="2" color="gray">Account #: </Text>
                          <Text size="3" weight="medium" style={{ fontFamily: 'monospace' }}>
                            {account.accountNumber}
                          </Text>
                        </Box>

                        <Box>
                          <Text size="2" color="gray">Routing #: </Text>
                          <Text size="3" weight="medium" style={{ fontFamily: 'monospace' }}>
                            {account.routingNumber || '114094397'}
                          </Text>
                        </Box>

                        <Box>
                          <Text size="2" color="gray">Opened: </Text>
                          <Text size="3" weight="medium">{formatDate(account.createdAt)}</Text>
                        </Box>
                      </Flex>
                    </Box>
                  </Card>
                </Box>
              </Flex>
            </Flex>
          </Box>
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
              <Text size="4" weight="bold">Transaction History</Text>

              {account.transactions && account.transactions.length > 0 ? (
                <Card>
                  <Table.Root className={noLastRowBorderClass as any}>
                    <Table.Header>
                      <Table.Row>
                        <Table.RowHeaderCell>Date</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Type</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Amount</Table.RowHeaderCell>
                        <Table.RowHeaderCell>Balance</Table.RowHeaderCell>
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
                              {getTransactionTypeLabel(transaction.type, (transaction as any).groupRole)}
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
                            <Text size="3" weight="medium">{formatCurrency(runningBalanceById.get(transaction.id) || 0)}</Text>
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
              <Card>
                        <Table.Root className={noLastRowBorderClass as any}>
                  <Table.Header>
                    <Table.Row>
                      <Table.RowHeaderCell>Date issued</Table.RowHeaderCell>
                      <Table.RowHeaderCell>Name on Card</Table.RowHeaderCell>
                      <Table.RowHeaderCell>Card Number</Table.RowHeaderCell>
                      <Table.RowHeaderCell>Expiration</Table.RowHeaderCell>
                      <Table.RowHeaderCell></Table.RowHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {cards.map(card => (
                      <Table.Row key={card.id}>
                        <Table.Cell><Text size="2" color="gray">{formatDate(card.createdAt)}</Text></Table.Cell>
                        <Table.Cell>{card.cardholderName}</Table.Cell>
                        <Table.Cell>**** **** **** {String(card.cardNumber).slice(-4)}</Table.Cell>
                        <Table.Cell>{String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</Table.Cell>
                        <Table.Cell>
                          <Flex gap="2" justify="end">
                            <Button size="1" variant="soft" onClick={() => openEditCardDialog(card)} style={{ cursor: 'pointer' }}><Pencil size={14} /> Edit</Button>
                            <Button size="1" variant="soft" onClick={() => { setSelectedCard(card); setShowShareCardDialog(true) }} style={{ cursor: 'pointer' }}>
                              <ShareNetwork size={14} /> Share
                            </Button>
                            <Button size="1" color="red" variant="soft" onClick={() => handleDeleteCard(card.id)} style={{ cursor: 'pointer' }}><Trash size={14} /> Delete</Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card>
            )}
          </Flex>
          </Box>
        </Tabs.Content>

        <Tabs.Content value="send">
          <Box style={{ paddingTop: '20px' }}>
            <Flex direction="column" gap="6">
              <Text size="4" weight="bold">Send Money</Text>

              <Flex gap="5" wrap="wrap" align="start">
                {/* Left: Recent payments */}
                <Box style={{ flex: '1 1 520px', minWidth: '320px' }}>
                  <Flex justify="between" align="center" style={{ marginBottom: 8 }}>
                    <Text size="3" weight="bold">Recent Payments</Text>
                    <Button onClick={() => setShowPaymentDialog(true)} style={{ cursor: 'pointer' }}>Send Payment</Button>
                  </Flex>
                  {loadingPayments ? (
                    <Text color="gray">Loading payments…</Text>
                  ) : payments.length === 0 ? (
                    <EmptyState
                      icon={<ListBullets size={48} />}
                      title="No payments yet"
                      description="Send your first payment via ACH or mailed check."
                    />
                  ) : (
                    <Card>
                      <Table.Root className={noLastRowBorderClass as any}>
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Payee</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {payments.map(tx => (
                            <Table.Row key={tx.id}>
                              <Table.Cell><Text size="2" color="gray">{formatDate(tx.createdAt)}</Text></Table.Cell>
                              <Table.Cell><Text size="2">{(tx as any).payee?.name || (tx as any).check?.payee?.name || '—'}</Text></Table.Cell>
                              <Table.Cell><Text size="2">{tx.type === 'ACH_PAYMENT' ? 'ACH' : 'Check'}</Text></Table.Cell>
                              <Table.Cell><Text size="3" weight="medium">{formatCurrency(Math.abs(tx.amount))}</Text></Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Card>
                  )}
                </Box>

                {/* Right: Payees */}
                <Box style={{ flex: '1 1 520px', minWidth: '320px' }}>
                  <Flex justify="between" align="center" style={{ marginBottom: 8 }}>
                    <Text size="3" weight="bold">Payees</Text>
                    <Button onClick={() => { setEditingPayeeId(null); setPayeeForm({ name: '', country: 'US' }); setShowPayeeDialog(true) }} style={{ cursor: 'pointer' }}><Plus size={16} /> Add</Button>
                  </Flex>
                  {loadingPayees ? (
                    <Text color="gray">Loading payees…</Text>
                  ) : payees.length === 0 ? (
                    <EmptyState
                      icon={<ListBullets size={48} />}
                      title="No payees yet"
                      description="Add a payee to send ACH or mailed check payments."
                    />
                  ) : (
                    <Card>
                      <Table.Root className={noLastRowBorderClass as any}>
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Total Paid</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {payees.map(p => (
                            <Table.Row key={p.id}>
                              <Table.Cell>{p.name}</Table.Cell>
                              <Table.Cell>
                                <Text size="2" color="gray">{[p.city, p.state].filter(Boolean).join(', ') || '—'}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" weight="medium">{formatCurrency(totalPaidByPayeeId[p.id] || 0)}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Flex gap="2" justify="end">
                                  <Button size="1" variant="soft" onClick={() => { setEditingPayeeId(p.id); setPayeeForm({
                                    name: p.name || '',
                                    email: p.email || '',
                                    phone: p.phone || '',
                                    addressLine1: p.addressLine1 || '',
                                    addressLine2: p.addressLine2 || '',
                                    city: p.city || '',
                                    state: p.state || '',
                                    postalCode: p.postalCode || '',
                                    country: p.country || 'US',
                                    achRoutingNumber: p.achRoutingNumber || '',
                                    achAccountNumber: p.achAccountNumber || ''
                                  } as any); setShowPayeeDialog(true) }} style={{ cursor: 'pointer' }}>Edit</Button>
                                  <Button size="1" color="red" variant="soft" onClick={() => deletePayee(p.id)} style={{ cursor: 'pointer' }}>
                                    <Trash size={16} /> Delete
                                  </Button>
                                </Flex>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Card>
                  )}
                </Box>
              </Flex>

              {/* Payment Dialog */}
              <Dialog.Root open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <Dialog.Content maxWidth="520px">
                  <Dialog.Title>Send Payment</Dialog.Title>
                  <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
                    <Text size="2" color="gray">Method</Text>
                    <Select.Root value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'ACH' | 'CHECK')}>
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="ACH">ACH</Select.Item>
                        <Select.Item value="CHECK">Mail Check</Select.Item>
                      </Select.Content>
                    </Select.Root>

                    <Text size="2" color="gray">Payee</Text>
                    <Select.Root value={selectedPayeeId} onValueChange={setSelectedPayeeId}>
                      <Select.Trigger placeholder="Choose payee" />
                      <Select.Content>
                        {payees.map(p => (
                          <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    <Text size="2" color="gray">Amount</Text>
                    <TextField.Root value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="100.00" />

                    <Text size="2" color="gray">Memo</Text>
                    <TextArea value={paymentMemo} onChange={(e) => setPaymentMemo(e.target.value)} placeholder="Optional memo" />
                  </Flex>
                  <Flex gap="3" justify="end" style={{ marginTop: 16 }}>
                    <Dialog.Close>
                      <Button variant="soft">Cancel</Button>
                    </Dialog.Close>
                    <Button disabled={submittingPayment} onClick={async () => { await submitPayment(); await fetchPayments(); setShowPaymentDialog(false) }} style={{ cursor: 'pointer' }}>
                      {submittingPayment ? 'Sending…' : 'Send Payment'}
                    </Button>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>

              {/* Add Payee Dialog */}
              <Dialog.Root open={showPayeeDialog} onOpenChange={(o) => { setShowPayeeDialog(o); if (!o) { setEditingPayeeId(null); setPayeeForm({ name: '', country: 'US' }) } }}>
                <Dialog.Content maxWidth="520px">
                  <Dialog.Title>{editingPayeeId ? 'Edit Payee' : 'Add Payee'}</Dialog.Title>
                  <Dialog.Description>Save a recipient for ACH or mailed checks.</Dialog.Description>
                  <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
                    <TextField.Root placeholder="Name" value={payeeForm.name || ''} onChange={(e) => setPayeeForm(f => ({ ...f, name: e.target.value }))} />
                    <TextField.Root placeholder="Email (optional)" value={payeeForm.email || ''} onChange={(e) => setPayeeForm(f => ({ ...f, email: e.target.value }))} />
                    <TextField.Root placeholder="Phone (optional)" value={payeeForm.phone || ''} onChange={(e) => setPayeeForm(f => ({ ...f, phone: e.target.value }))} />
                    <TextField.Root placeholder="Address line 1" value={payeeForm.addressLine1 || ''} onChange={(e) => setPayeeForm(f => ({ ...f, addressLine1: e.target.value }))} />
                    <TextField.Root placeholder="Address line 2" value={payeeForm.addressLine2 || ''} onChange={(e) => setPayeeForm(f => ({ ...f, addressLine2: e.target.value }))} />
                    <Flex gap="3">
                      <TextField.Root placeholder="City" value={payeeForm.city || ''} onChange={(e) => setPayeeForm(f => ({ ...f, city: e.target.value }))} />
                      <TextField.Root placeholder="State" value={payeeForm.state || ''} onChange={(e) => setPayeeForm(f => ({ ...f, state: e.target.value }))} />
                      <TextField.Root placeholder="Postal code" value={payeeForm.postalCode || ''} onChange={(e) => setPayeeForm(f => ({ ...f, postalCode: e.target.value }))} />
                    </Flex>
                    <Flex gap="3">
                      <TextField.Root placeholder="Routing number (ACH optional)" value={payeeForm.achRoutingNumber || ''} onChange={(e) => setPayeeForm(f => ({ ...f, achRoutingNumber: e.target.value }))} />
                      <TextField.Root placeholder="Account number (ACH optional)" value={payeeForm.achAccountNumber || ''} onChange={(e) => setPayeeForm(f => ({ ...f, achAccountNumber: e.target.value }))} />
                    </Flex>
                  </Flex>
                  <Flex gap="3" justify="end" style={{ marginTop: 16 }}>
                    <Dialog.Close>
                      <Button variant="soft">Cancel</Button>
                    </Dialog.Close>
                    <Button onClick={savePayee} disabled={savingPayee} style={{ cursor: 'pointer' }}>{savingPayee ? 'Saving…' : 'Save Payee'}</Button>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>
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

                  {/* Account number display removed from settings */}

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
                  style={{ cursor: 'pointer' }}
                >
                  <Trash size={16} />
                  Delete Account
                </Button>
              </Box>
            </Card>
          </Flex>
          </Box>
        </Tabs.Content>

        {/* Fundraising Tab */}
        <Tabs.Content value="fundraising">
        <Box style={{ paddingTop: '20px' }}>
          <Flex direction="column" gap="6">
            <Card>
              <Box style={{ padding: 24 }}>
                <Flex align="center" justify="between">
                  <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>Fundraising</Text>
                  <Flex align="center" gap="3">
                    <Text size="2" color="gray">Enable</Text>
                    <Switch checked={fundraisingEnabled} onCheckedChange={(v) => setFundraisingEnabled(!!v)} />
                    <Button
                      variant="outline"
                      onClick={() => { if (typeof window !== 'undefined') window.open(`/fundraising/${accountId}`, '_blank') }}
                      disabled={!fundraisingEnabled}
                      style={{ cursor: fundraisingEnabled ? 'pointer' : 'not-allowed' }}
                    >
                      View Public Page
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            </Card>

            {!fundraisingEnabled ? (
              <Card>
                <Box style={{ padding: 24 }}>
                  <Text size="3" color="gray">Turn on fundraising to create a public page, embeddable widgets, and a thank-you message.</Text>
                </Box>
              </Card>
            ) : (
              <>
                {/* Section: Analytics */}
                <Card>
                  <Box style={{ padding: 24 }}>
                    <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Fundraising Analytics</Text>
                    <Flex gap="4" wrap="wrap">
                    <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Donation Count" value={`${fundraisingStats.donationCount}`} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Donations" value={formatCurrency(fundraisingStats.donationTotal)} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Matches" value={formatCurrency(fundraisingStats.matchTotal)} />
                      </Box>
                      <Box style={{ flex: '1 1 220px' }}>
                        <AnalyticsStat label="Raised" value={formatCurrency(fundraisingStats.raised)} />
                      </Box>
                    </Flex>
                    {!!fundraising.page.goal && Number(fundraising.page.goal) > 0 && (
                      <Box style={{ marginTop: 16 }}>
                        <Text size="2" color="gray" style={{ display: 'block', marginBottom: 6 }}>Progress toward goal ({formatCurrency(Number(fundraising.page.goal))})</Text>
                        <Progress value={Math.min(100, Math.round((fundraisingStats.raised / Number(fundraising.page.goal)) * 100))} />
                      </Box>
                    )}
                  </Box>
                </Card>

                {/* Section 1: Fundraising Page */}
                <Card>
                  <Box style={{ padding: 24 }}>
                    <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Fundraising Page</Text>
                    <Flex direction="column" gap="4">
                      <Box>
                        <Text size="2" weight="medium">Title</Text>
                        <TextField.Root
                          value={fundraising.page.title}
                          onChange={(e) => setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, title: e.target.value } }))}
                          placeholder="Campaign title"
                        />
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">Description</Text>
                        <TextArea
                          value={fundraising.page.description}
                          onChange={(e) => setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, description: e.target.value } }))}
                          placeholder="Tell supporters about your campaign"
                          rows={4}
                        />
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">Image</Text>
                        <Flex align="center" gap="3" wrap="wrap">
                          {fundraising.page.image ? (
                            <Box style={{ position: 'relative', width: '160px', height: '100px', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-6)' }}>
                              <img src={fundraising.page.image} alt="Fundraising" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <IconButton
                                variant="solid"
                                size="1"
                                color="red"
                                onClick={() => setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, image: '' } }))}
                                style={{ position: 'absolute', top: 6, right: 6, cursor: 'pointer' }}
                              >
                                <X size={12} />
                              </IconButton>
                            </Box>
                          ) : (
                            <FileUpload
                              bucket="uploads"
                              folder={`fundraising/${accountId}`}
                              showPreview={false}
                              onUploadComplete={(res) => {
                                if (res.url) {
                                  setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, image: res.url } }))
                                }
                              }}
                            />
                          )}
                        </Flex>
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">Fundraising Goal</Text>
                        <TextField.Root
                          type="number"
                          min="0"
                          value={fundraising.page.goal}
                          onChange={(e) => setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, goal: e.target.value } }))}
                          placeholder="1000"
                        />
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">Publish Settings</Text>
                        <Select.Root
                          value={fundraising.page.publish}
                          onValueChange={(v) => {
                            const canPublish = fundraising.page.title.trim().length > 0 && fundraising.page.description.trim().length > 0
                            if (v === 'Public' && !canPublish) {
                              showToast(createToast.error('Missing fields', 'Set Title and Description before making the page public.'))
                              return
                            }
                            setFundraising((prev: any) => ({ ...prev, page: { ...prev.page, publish: v } }))
                          }}
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="Unlisted">Unlisted</Select.Item>
                            <Select.Item value="Public">Public</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Box>

                    </Flex>
                  </Box>
                </Card>

                {/* Section: Matching */}
                <Card>
                  <Box style={{ padding: 24 }}>
                    <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Matching</Text>
                    <Flex direction="column" gap="3">
                      {/* Derive available matching accounts excluding this account */}
                      {/* We avoid using useMemo to keep edits minimal */}
                      {(() => null)()}
                      {/**/}
                      <Box>
                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: 6 }}>Enable Matching</Text>
                        <Switch
                          checked={!!fundraising.matchingEnabled}
                          onCheckedChange={(v) => {
                            const available = userAccounts.filter((a) => a.id !== accountId)
                            if (v && available.length === 0) {
                              showToast(createToast.error('Another account required', 'Create a second account to enable matching.'))
                              return
                            }
                            setFundraising((prev: any) => ({ ...prev, matchingEnabled: !!v }))
                          }}
                        />
                      </Box>
                      {fundraising.matchingEnabled && (
                        <Flex direction="column" gap="3">
                          <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: 6 }}>Match Percent</Text>
                            <TextField.Root
                              type="number"
                              min="0"
                              max="100"
                              value={fundraising.matchingPercent ?? ''}
                              onChange={(e) => setFundraising((prev: any) => ({ ...prev, matchingPercent: Number(e.target.value) }))}
                              placeholder="50"
                              style={{ width: '100px' }}
                            />
                          </Box>
                          <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: 6 }}>From Account</Text>
                            <Select.Root
                              value={fundraising.matchingFromAccountId && fundraising.matchingFromAccountId !== accountId ? fundraising.matchingFromAccountId : ''}
                              onValueChange={(v) => setFundraising((prev: any) => ({ ...prev, matchingFromAccountId: v }))}
                            >
                              <Select.Trigger placeholder="Select account" />
                              <Select.Content>
                                {userAccounts.filter((a) => a.id !== accountId).map((a) => (
                                  <Select.Item key={a.id} value={a.id}>{a.nickname}</Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          </Box>
                        </Flex>
                      )}
                      {userAccounts.filter((a) => a.id !== accountId).length === 0 && (
                        <Text size="2" color="gray">Create another account to enable matching and choose it as the matching source.</Text>
                      )}
                    </Flex>
                  </Box>
                </Card>

                {/* Section 2: Fundraising Widgets */}
                <Card>
                  <Box style={{ padding: 24 }}>
                    <Flex justify="between" align="center" style={{ marginBottom: 12 }}>
                      <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan' }}>Fundraising Widgets</Text>
                      <Button onClick={addWidget} style={{ cursor: 'pointer' }}>
                        <Plus size={16} />
                        Add Widget
                      </Button>
                    </Flex>
                    {fundraising.widgets.length === 0 ? (
                      <Text size="2" color="gray">No widgets yet. Click "Add Widget" to create your first embeddable form.</Text>
                    ) : (
                      <Flex direction="column" gap="4">
                        {fundraising.widgets.map((w: any) => (
                          <Card key={w.id} style={{ borderColor: 'var(--gray-6)' }}>
                            <Box style={{ padding: 16 }}>
                              <Flex justify="between" align="center" style={{ marginBottom: 8 }}>
                                <TextField.Root
                                  value={w.name}
                                  onChange={(e) => updateWidgetName(w.id, e.target.value)}
                                  placeholder="Widget name"
                                  style={{ maxWidth: 320 }}
                                />
                                <Flex gap="2">
                                  <Button variant="soft" onClick={() => copyEmbed(w.id)} style={{ cursor: 'pointer' }}>Copy Embed</Button>
                                  <Button variant="soft" color="red" onClick={() => removeWidget(w.id)} style={{ cursor: 'pointer' }}>Remove</Button>
                                </Flex>
                              </Flex>
                              <Box style={{ backgroundColor: 'var(--gray-3)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
                                <Text size="2" style={{ fontFamily: 'monospace' }}>{getEmbedCode(w.id)}</Text>
                              </Box>
                            </Box>
                          </Card>
                        ))}
                      </Flex>
                    )}
                  </Box>
                </Card>

                {/* Section 3: Donation Thank You Message */}
                <Card>
                  <Box style={{ padding: 24 }}>
                    <Text size="4" weight="bold" style={{ fontFamily: 'F37Jan', display: 'block', marginBottom: 12 }}>Donation Thank You Message</Text>
                    <TextArea
                      value={fundraising.thankYou}
                      onChange={(e) => setFundraising((prev: any) => ({ ...prev, thankYou: e.target.value }))}
                      rows={4}
                      placeholder="Thank you for your donation..."
                    />
                    <Text size="2" color="gray" style={{ display: 'block', marginTop: 8 }}>
                      This message will be emailed with the receipt including amount, date, and campaign title.
                    </Text>
                  </Box>
                </Card>

                {/* Actions */}
                <Flex justify="end" align="center" style={{ marginTop: '8px' }}>
                  <Button
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session?.access_token) return
                      // Validate matching selection
                      if (fundraising.matchingEnabled) {
                        const available = userAccounts.filter((a) => a.id !== accountId)
                        if (available.length === 0) {
                          showToast(createToast.error('Another account required', 'Create a second account to enable matching.'))
                          return
                        }
                        if (!fundraising.matchingFromAccountId || fundraising.matchingFromAccountId === accountId) {
                          showToast(createToast.error('Select matching account', 'Choose a different account to fund the match.'))
                          return
                        }
                      }
                      const payload = {
                        enabled: fundraisingEnabled,
                        title: fundraising.page.title || null,
                        description: fundraising.page.description || null,
                        imageUrl: fundraising.page.image || null,
                        goal: fundraising.page.goal ? Number(fundraising.page.goal) : null,
                        publishStatus: fundraising.page.publish === 'Public' ? 'PUBLIC' : 'UNLISTED',
                        thankYouMessage: fundraising.thankYou || null,
                        matchingEnabled: !!fundraising.matchingEnabled,
                        matchingPercent: fundraising.matchingEnabled ? Number(fundraising.matchingPercent || 0) : null,
                        matchingFromAccountId: fundraising.matchingEnabled ? (fundraising.matchingFromAccountId || null) : null,
                      }
                      const res = await fetch(`/api/accounts/${accountId}/fundraising`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify(payload)
                      })
                      if (res.ok) showToast(createToast.success('Saved', 'Fundraising settings saved'))
                      else showToast(createToast.error('Error', 'Failed to save settings'))
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Save Settings
                  </Button>
                </Flex>
              </>
            )}
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
      <Dialog.Root open={showCreateCardDialog} onOpenChange={setShowCreateCardDialog}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Issue Card</Dialog.Title>
          <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
            <TextField.Root placeholder="Cardholder name" value={cardForm.cardholderName} onChange={(e) => setCardForm(f => ({ ...f, cardholderName: e.target.value }))} />
            <Flex gap="3">
              <TextField.Root placeholder="Daily limit (optional)" value={cardForm.dailyLimit} onChange={(e) => setCardForm(f => ({ ...f, dailyLimit: e.target.value }))} />
              <TextField.Root placeholder="Monthly limit (optional)" value={cardForm.monthlyLimit} onChange={(e) => setCardForm(f => ({ ...f, monthlyLimit: e.target.value }))} />
            </Flex>
            <Box>
              <Text size="2" color="gray">Allowed categories</Text>
              <Flex direction="column" gap="2" style={{ marginTop: 6 }}>
                {['Groceries','Medical Expenses','Rent & Utilities','Clothing','Instacart','Transportation','Travel','Dining'].map(c => (
                  <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={cardForm.allowedCategories.includes(c)} onChange={(e) => setCardForm(f => ({ ...f, allowedCategories: e.target.checked ? Array.from(new Set([...(f.allowedCategories || []), c])) : (f.allowedCategories || []).filter(x => x !== c) }))} />
                    <Text size="2">{c}</Text>
                  </label>
                ))}
              </Flex>
            </Box>
          </Flex>
          <Flex gap="3" justify="end" style={{ marginTop: 16 }}>
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleCreateCard} disabled={savingCard} style={{ cursor: 'pointer' }}>{savingCard ? 'Issuing…' : 'Issue Card'}</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit Card Dialog */}
      <Dialog.Root open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Edit Card</Dialog.Title>
          <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
            <TextField.Root placeholder="Cardholder name" value={cardForm.cardholderName} onChange={(e) => setCardForm(f => ({ ...f, cardholderName: e.target.value }))} />
            <Flex gap="3">
              <TextField.Root placeholder="Daily limit (optional)" value={cardForm.dailyLimit} onChange={(e) => setCardForm(f => ({ ...f, dailyLimit: e.target.value }))} />
              <TextField.Root placeholder="Monthly limit (optional)" value={cardForm.monthlyLimit} onChange={(e) => setCardForm(f => ({ ...f, monthlyLimit: e.target.value }))} />
            </Flex>
            <Box>
              <Text size="2" color="gray">Allowed categories</Text>
              <Flex direction="column" gap="2" style={{ marginTop: 6 }}>
                {['Groceries','Medical Expenses','Rent & Utilities','Clothing','Instacart','Transportation','Travel','Dining'].map(c => (
                  <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={cardForm.allowedCategories.includes(c)} onChange={(e) => setCardForm(f => ({ ...f, allowedCategories: e.target.checked ? Array.from(new Set([...(f.allowedCategories || []), c])) : (f.allowedCategories || []).filter(x => x !== c) }))} />
                    <Text size="2">{c}</Text>
                  </label>
                ))}
              </Flex>
            </Box>
          </Flex>
          <Flex gap="3" justify="end" style={{ marginTop: 16 }}>
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleUpdateCard} disabled={savingCard} style={{ cursor: 'pointer' }}>{savingCard ? 'Saving…' : 'Save Changes'}</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Share Card Dialog */}
      <Dialog.Root open={showShareCardDialog} onOpenChange={setShowShareCardDialog}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Share Card</Dialog.Title>
          {selectedCard && (
            <Box style={{ marginTop: 12 }}>
              <Text size="2" color="gray">Preview</Text>
              <Box style={{ marginTop: 8, width: '100%', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                <Box
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.586', // Standard debit card ratio
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0b1220 100%)',
                    boxShadow: '0 16px 28px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Subtle sheen */}
                  <Box
                    style={{
                      position: 'absolute',
                      top: '-20%',
                      right: '-30%',
                      width: '80%',
                      height: '120%',
                      transform: 'rotate(20deg)',
                      background: 'radial-gradient(closest-side, rgba(255,255,255,0.08), rgba(255,255,255,0) 70%)'
                    }}
                  />

                  {/* Brand */}
                  <Flex justify="between" align="start" style={{ position: 'absolute', inset: '16px 16px auto 16px' }}>
                    <img src="/images/gloo-impact-logo-dark.svg" alt="Gloo Impact" style={{ height: 22, opacity: 0.9 }} />
                    <Badge variant="soft" color="gray" style={{ opacity: 0.7 }}>Debit</Badge>
                  </Flex>

                  {/* Chip */}
                  <Box style={{ position: 'absolute', left: 24, top: 56, width: 44, height: 32, background: 'linear-gradient(180deg, #d1d5db, #9ca3af)', borderRadius: 6, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.2)' }} />

                  {/* Number and meta */}
                  <Flex direction="column" style={{ position: 'absolute', left: 24, right: 24, bottom: 22 }}>
                    <Text
                      size="6"
                      weight="bold"
                      style={{
                        letterSpacing: '2px',
                        fontFamily: 'monospace',
                        color: 'rgba(255,255,255,0.92)',
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)'
                      }}
                    >
                      **** **** **** {String(selectedCard.cardNumber).slice(-4)}
                    </Text>
                    <Flex justify="between" align="center" style={{ marginTop: 8 }}>
                      <Text size="2" style={{ color: 'rgba(255,255,255,0.85)' }}>{selectedCard.cardholderName}</Text>
                      <Text size="2" style={{ color: 'rgba(255,255,255,0.85)' }}>{String(selectedCard.expiryMonth).padStart(2, '0')}/{String(selectedCard.expiryYear).slice(-2)}</Text>
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            </Box>
          )}
          <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
            <TextField.Root placeholder="Email or phone" />
          </Flex>
          <Flex gap="3" justify="end" style={{ marginTop: 16 }}>
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={() => { showToast(createToast.success('Sent', 'Card shared successfully')); setShowShareCardDialog(false) }} style={{ cursor: 'pointer' }}>Send</Button>
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
