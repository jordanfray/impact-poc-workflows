'use client'

import { useState } from 'react'
import { Flex, Box, Text, Button, Card, Badge, Table } from "@radix-ui/themes"
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus"
import { CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard"
import { DashboardLayout } from "@/components/DashboardLayout"

// Mock data for now - we'll replace with real API calls later
const mockAccounts = [
  {
    id: '1',
    nickname: 'Primary Checking',
    accountNumber: '****1234',
    balance: 2450.75,
    createdAt: '2024-01-15',
    status: 'active'
  },
  {
    id: '2',
    nickname: 'Savings Account',
    accountNumber: '****5678',
    balance: 15750.00,
    createdAt: '2024-01-20',
    status: 'active'
  },
  {
    id: '3',
    nickname: 'Business Account',
    accountNumber: '****9012',
    balance: 8925.50,
    createdAt: '2024-02-01',
    status: 'active'
  }
]

export default function AccountsPage() {
  const [accounts] = useState(mockAccounts)

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

  return (
    <DashboardLayout title="Accounts">
      <Flex direction="column" gap="6">
        {/* Header with Create Button */}
        <Flex justify="between" align="center">
          <Box>
            <Text size="6" weight="bold" style={{ 
              fontFamily: 'F37Jan',
              color: 'var(--gray-12)'
            }}>
              Bank Accounts
            </Text>
            <Text size="3" color="gray" style={{ marginTop: 4 }}>
              Manage your banking accounts and view balances
            </Text>
          </Box>
          
          <Button 
            size="3"
            style={{ 
              backgroundColor: 'var(--accent-9)',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Create Account
          </Button>
        </Flex>

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
                {accounts.filter(acc => acc.status === 'active').length}
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
                    <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                      {account.accountNumber}
                    </Text>
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
                      color={account.status === 'active' ? 'green' : 'gray'}
                      variant="soft"
                    >
                      {account.status}
                    </Badge>
                  </Table.Cell>
                  
                  <Table.Cell>
                    <Button size="1" variant="ghost">
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
              
              <Button size="3" style={{ backgroundColor: 'var(--accent-9)' }}>
                <Plus size={16} />
                Create Your First Account
              </Button>
            </Flex>
          </Card>
        )}
      </Flex>
    </DashboardLayout>
  )
}
