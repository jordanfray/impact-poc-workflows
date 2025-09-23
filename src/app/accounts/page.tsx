'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Flex, Box, Text, Button, Card, Badge, Table, IconButton, DropdownMenu, Dialog, TextField } from "@radix-ui/themes"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { DotsThree } from "@phosphor-icons/react/dist/ssr/DotsThree"
import { ArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp"
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight"
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye"
import { DashboardLayout } from "@/components/DashboardLayout"
import { TransferModal } from "@/components/TransferModal"
import { formatCurrency } from '@/lib/utils'

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
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferFromAccountId, setTransferFromAccountId] = useState<string | undefined>()

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
    if (!newAccountName.trim()) {
      return // Don't create without a name
    }

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
        },
        body: JSON.stringify({
          nickname: newAccountName.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Reset form and close dialog
        setNewAccountName('')
        setShowCreateDialog(false)
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


  const createAccountButton = (
    <Button 
      size="3"
      onClick={() => setShowCreateDialog(true)}
      style={{ 
        backgroundColor: 'var(--accent-9)',
        cursor: 'pointer'
      }}
    >
      <Plus size={16} />
      Create Account
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
        {/* Accounts Table (shown only when accounts exist) */}
        {accounts.length > 0 && (
          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Account</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Account Number</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">Balance</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="48px"></Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {accounts.map((account) => (
                  <Table.Row key={account.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/accounts/${account.id}`)}>
                    <Table.Cell>
                      <Flex align="center" gap="3">
                        <Box>
                          <Text size="3" weight="regular" style={{ 
                            fontFamily: 'F37Jan',
                            color: 'var(--gray-12)'
                          }}>
                            {account.nickname}
                          </Text>
                        </Box>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="3" weight="regular" style={{ 
                        fontFamily: 'F37Jan',
                        letterSpacing: '0.5px'
                      }}>
                        {account.accountNumber}
                      </Text>
                    </Table.Cell>
                    <Table.Cell align="right">
                      <Text size="3" weight="regular" style={{ 
                        fontFamily: 'F37Jan',
                        color: 'var(--gray-12)'
                      }}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </Table.Cell>

                    <Table.Cell>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <IconButton
                            size="2"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DotsThree size={16} />
                          </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/accounts/${account.id}`)
                          }}>
                            <Flex align="center" gap="2">
                              <Eye size={14} />
                              View Details
                            </Flex>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Implement quick deposit
                            console.log('Quick deposit for account:', account.id)
                          }}>
                            <Flex align="center" gap="2">
                              <ArrowUp size={14} />
                              Deposit
                            </Flex>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onClick={(e) => {
                            e.stopPropagation()
                            setTransferFromAccountId(account.id)
                            setShowTransferModal(true)
                          }}>
                            <Flex align="center" gap="2">
                              <ArrowRight size={14} />
                              Transfer
                            </Flex>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        )}

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
                onClick={() => setShowCreateDialog(true)}
                style={{ backgroundColor: 'var(--accent-9)', cursor: 'pointer' }}
              >
                <Plus size={16} />
                Create Your First Account
              </Button>
            </Flex>
          </Card>
        )}
          </>
        )}
      </Flex>

      {/* Create Account Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Create New Account</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Enter a name for your new banking account.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Account Name
              </Text>
              <TextField.Root
                placeholder="e.g. Personal Checking, Savings, etc."
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAccountName.trim()) {
                    handleCreateAccount()
                  }
                }}
              />
            </label>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button 
                onClick={handleCreateAccount}
                disabled={creating || !newAccountName.trim()}
                style={{ 
                  backgroundColor: 'var(--accent-9)',
                  cursor: 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create Account'}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Transfer Modal */}
      <TransferModal 
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false)
          setTransferFromAccountId(undefined)
        }}
        preselectedFromAccountId={transferFromAccountId}
        onTransferComplete={fetchAccounts}
      />
    </DashboardLayout>
  )
}
