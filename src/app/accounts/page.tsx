'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Flex, Box, Text, Button, Card, Badge, Table, IconButton } from "@radix-ui/themes"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye"
import { EyeSlash } from "@phosphor-icons/react/dist/ssr/EyeSlash"
import { DashboardLayout } from "@/components/DashboardLayout"

interface Account {
  id: string
  nickname: string
  accountNumber: string
  balance: number
  createdAt: string
  updatedAt: string
  _count?: {
    transactions: number
    cards: number
  }
}

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [visibleAccountNumbers, setVisibleAccountNumbers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      } else {
        console.error('Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    try {
      setCreating(true)
      
      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Navigate to the new account page
        router.push(`/accounts/${data.account.id}`)
      } else {
        console.error('Failed to create account')
      }
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setCreating(false)
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
      day: 'numeric'
    })
  }

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber
    // Add spacing between asterisks and pad to match full number width
    const lastFour = accountNumber.slice(-4)
    const maskedPart = '* * * *'
    return `${maskedPart}${lastFour}`
  }

  const toggleAccountNumberVisibility = (accountId: string) => {
    const newVisibleNumbers = new Set(visibleAccountNumbers)
    if (newVisibleNumbers.has(accountId)) {
      newVisibleNumbers.delete(accountId)
    } else {
      newVisibleNumbers.add(accountId)
    }
    setVisibleAccountNumbers(newVisibleNumbers)
  }

  const createAccountButton = (
    <Button 
      size="3"
      onClick={handleCreateAccount}
      disabled={creating}
      style={{ 
        backgroundColor: 'var(--accent-9)',
        cursor: 'pointer'
      }}
    >
      <Plus size={16} />
      {creating ? 'Creating...' : 'Create Account'}
    </Button>
  )

  return (
    <DashboardLayout 
      title="Accounts" 
      subtitle="Manage your banking accounts and view balances"
      action={createAccountButton}
    >
      <Flex direction="column" gap="6">
        {loading ? (
          <Text>Loading accounts...</Text>
        ) : (
          <>
        {/* Accounts Summary Cards */}
        <Flex gap="4" wrap="wrap">
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Total Balance</Text>
              <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
              </Text>
            </Flex>
          </Card>
          
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Active Accounts</Text>
            <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>
              {accounts.length}
            </Text>
            </Flex>
          </Card>
          
          <Card style={{ minWidth: 200, flex: 1 }}>
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Average Balance</Text>
              <Text size="5" weight="bold" style={{ fontFamily: 'F37Jan' }}>
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0) / accounts.length)}
              </Text>
            </Flex>
          </Card>
        </Flex>

        {/* Accounts Table */}
        <Card>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Account</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Account Number</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {accounts.map((account) => (
                <Table.Row key={account.id}>
                  <Table.Cell>
                    <Flex align="center" gap="3">
                      <Box style={{ 
                        backgroundColor: 'var(--accent-3)',
                        borderRadius: 8,
                        padding: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CreditCard size={16} color="var(--accent-11)" />
                      </Box>
                      <Box>
                        <Text size="3" weight="medium" style={{ 
                          fontFamily: 'F37Jan',
                          color: 'var(--gray-12)'
                        }}>
                          {account.nickname}
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Text size="2" color="gray" style={{ 
                        fontFamily: 'monospace',
                        minWidth: '100px',
                        letterSpacing: '1px',
                        display: 'inline-block'
                      }}>
                        {visibleAccountNumbers.has(account.id) 
                          ? account.accountNumber 
                          : maskAccountNumber(account.accountNumber)
                        }
                      </Text>
                      <IconButton 
                        variant="ghost" 
                        size="1"
                        onClick={() => toggleAccountNumberVisibility(account.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {visibleAccountNumbers.has(account.id) 
                          ? <EyeSlash size={12} /> 
                          : <Eye size={12} />
                        }
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Text size="3" weight="medium" style={{ 
                      fontFamily: 'F37Jan',
                      color: account.balance > 0 ? 'var(--green-11)' : 'var(--red-11)'
                    }}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {formatDate(account.createdAt)}
                    </Text>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Badge 
                      color="green"
                      variant="soft"
                    >
                      active
                    </Badge>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Button 
                      size="1" 
                      variant="ghost"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      View Details
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>

        {/* Empty State (when no accounts) */}
        {accounts.length === 0 && (
          <Card style={{ padding: 40, textAlign: 'center' }}>
            <Flex direction="column" align="center" gap="4">
              <Box style={{ 
                backgroundColor: 'var(--gray-3)',
                borderRadius: '50%',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard size={32} color="var(--gray-9)" />
              </Box>
              
              <Box>
                <Text size="4" weight="bold" style={{ 
                  fontFamily: 'F37Jan',
                  color: 'var(--gray-12)'
                }}>
                  No accounts yet
                </Text>
                <Text size="3" color="gray" style={{ marginTop: 4 }}>
                  Create your first bank account to get started
                </Text>
              </Box>
              
              <Button 
                size="3" 
                onClick={handleCreateAccount}
                disabled={creating}
                style={{ backgroundColor: 'var(--accent-9)', cursor: 'pointer' }}
              >
                <Plus size={16} />
                {creating ? 'Creating...' : 'Create Your First Account'}
              </Button>
            </Flex>
          </Card>
        )}
          </>
        )}
      </Flex>
    </DashboardLayout>
  )
}
