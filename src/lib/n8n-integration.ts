/**
 * n8n Integration for Banking Automation
 * 
 * This module provides integration with n8n workflows for banking automation tasks
 */

interface N8nUserContext {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  phone?: string | null
}

interface N8nWebhookPayload {
  accountId?: string
  amount?: number
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  metadata?: Record<string, any>
  // Event context
  transactionId?: string
  accountNumber?: string
  accountNickname?: string
  accountBalance?: any
  threshold?: number
  balance?: any
  status?: string
  transferFromAccountId?: string | null
  transferToAccountId?: string | null
  cardId?: string
  checkId?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  eventType?: string
  timestamp?: string
  // User context for personalization
  user?: N8nUserContext
}

interface N8nWorkflowTrigger {
  workflowId: string
  webhookUrl: string
  description: string
}

export class N8nBankingAutomation {
  private baseUrl: string
  private authToken?: string
  private testMode: boolean

  constructor(baseUrl = 'http://localhost:5678') {
    this.baseUrl = baseUrl
    this.testMode = process.env.N8N_TEST_MODE === 'true'
  }

  /**
   * Get the appropriate webhook URL based on test mode
   */
  private getWebhookUrl(path: string): string {
    const webhookPath = this.testMode ? 'webhook-test' : 'webhook'
    return `${this.baseUrl}/${webhookPath}/${path}`
  }

  /**
   * Banking automation workflows that could be implemented with n8n:
   */
  static readonly WORKFLOWS = {
    // Transaction monitoring and alerts
    FRAUD_DETECTION: {
      description: 'Monitor transactions for suspicious patterns',
      triggers: ['large_transaction', 'unusual_location', 'rapid_transactions']
    },
    
    // Account management
    ACCOUNT_NOTIFICATIONS: {
      description: 'Send notifications for account events',
      triggers: ['low_balance', 'account_created', 'card_issued']
    },
    
    // Compliance and reporting
    COMPLIANCE_REPORTING: {
      description: 'Generate regulatory reports automatically',
      triggers: ['monthly_report', 'suspicious_activity', 'large_cash_transaction']
    },
    
    // Customer communication
    CUSTOMER_ALERTS: {
      description: 'Automated customer communications',
      triggers: ['transaction_complete', 'payment_due', 'account_update']
    },
    
    // Integration workflows
    EXTERNAL_SYNC: {
      description: 'Sync with external banking APIs or services',
      triggers: ['ach_processing', 'wire_transfer', 'card_authorization']
    }
  }

  /**
   * Trigger an n8n workflow via webhook
   */
  async triggerWorkflow(webhookUrl: string, payload: N8nWebhookPayload): Promise<any> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return await response.json()
      }
      // Fallback for Webhook nodes that return plain text (e.g., "firstEntryJson")
      return await response.text()
    } catch (error) {
      console.error('Failed to trigger n8n workflow:', error)
      throw error
    }
  }

  /**
   * Banking-specific workflow triggers
   */
  async onTransactionCreated(transaction: any, account: any, user?: N8nUserContext) {
    console.log(`🤖 n8n automation trigger - Transaction Created (Test Mode: ${this.testMode})`)

    // Trigger Transaction Cleared event
    await this.triggerWorkflow(
      this.getWebhookUrl('transaction-cleared'),
      {
        transactionId: transaction.id,
        accountId: transaction.accountId,
        accountNumber: account.accountNumber,
        accountNickname: account.nickname,
        accountBalance: account.balance,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        cardId: transaction.cardId,
        checkId: transaction.checkId,
        transferFromAccountId: transaction.transferFromAccountId,
        transferToAccountId: transaction.transferToAccountId,
        eventType: 'transaction-cleared',
        timestamp: new Date().toISOString(),
        metadata: { trigger: 'transaction_processed' },
        user
      }
    )

    // Trigger large transaction alert (fraud detection)
    if (transaction.amount > 10000) {
      await this.triggerWorkflow(
        this.getWebhookUrl('large-transaction'),
        {
          transactionId: transaction.id,
          accountId: transaction.accountId,
          accountNumber: account.accountNumber,
          accountNickname: account.nickname,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          eventType: 'large-transaction',
          timestamp: new Date().toISOString(),
          metadata: { trigger: 'large_amount', threshold: 10000 },
          user
        }
      )
    }

    // For transfers, also trigger transfer-complete
    if (transaction.type === 'TRANSFER') {
      await this.triggerWorkflow(
        this.getWebhookUrl('transfer-complete'),
        {
          transactionId: transaction.id,
          accountId: transaction.accountId,
          accountNumber: account.accountNumber,
          accountNickname: account.nickname,
          accountBalance: account.balance,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          transferFromAccountId: transaction.transferFromAccountId,
          transferToAccountId: transaction.transferToAccountId,
          eventType: 'transfer-complete',
          timestamp: new Date().toISOString(),
          metadata: { trigger: 'transfer_completed' },
          user
        }
      )
    }
  }

  async onAccountCreated(account: any, user?: N8nUserContext) {
    console.log(`🤖 n8n automation trigger - Account Created (Test Mode: ${this.testMode})`)
    await this.triggerWorkflow(
      this.getWebhookUrl('account-created'),
      {
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountNickname: account.nickname,
        balance: account.balance,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        eventType: 'account-created',
        timestamp: new Date().toISOString(),
        metadata: { event: 'account_created' },
        user
      }
    )
  }

  async onCardIssued(accountId: string, cardId: string, user?: N8nUserContext) {
    console.log(`🤖 n8n automation trigger - Card Issued (Test Mode: ${this.testMode})`)
    await this.triggerWorkflow(
      this.getWebhookUrl('card-created'),
      { 
        accountId, 
        cardId,
        eventType: 'card-created',
        timestamp: new Date().toISOString(),
        metadata: { event: 'card_issued', cardId },
        user
      }
    )
  }

  async onLowBalance(accountId: string, currentBalance: number, threshold: number = 100, user?: N8nUserContext) {
    console.log(`🤖 n8n automation trigger - Low Balance (Test Mode: ${this.testMode})`)
    await this.triggerWorkflow(
      this.getWebhookUrl('low-balance'),
      { 
        accountId, 
        accountBalance: currentBalance,
        threshold,
        eventType: 'low-balance',
        timestamp: new Date().toISOString(),
        metadata: { trigger: 'balance_below_threshold' },
        user
      }
    )
  }
}

export const n8nAutomation = new N8nBankingAutomation()
