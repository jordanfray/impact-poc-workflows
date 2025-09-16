"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingNotification = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class BankingNotification {
    constructor() {
        this.description = {
            displayName: 'Impact Notification',
            name: 'impactNotification',
            icon: 'fa:bell',
            group: ['Impact'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Send banking-related notifications',
            defaults: {
                name: 'Banking Notification',
            },
            inputs: ["main" /* NodeConnectionType.Main */],
            outputs: ["main" /* NodeConnectionType.Main */],
            credentials: [
                {
                    name: 'bankingApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Transaction Alert',
                            value: 'transactionAlert',
                            description: 'Send transaction completion notification',
                            action: 'Send transaction alert',
                        },
                        {
                            name: 'Fraud Alert',
                            value: 'fraudAlert',
                            description: 'Send fraud detection alert',
                            action: 'Send fraud alert',
                        },
                        {
                            name: 'Account Welcome',
                            value: 'accountWelcome',
                            description: 'Send welcome message for new account',
                            action: 'Send account welcome',
                        },
                        {
                            name: 'Low Balance Alert',
                            value: 'lowBalance',
                            description: 'Send low balance notification',
                            action: 'Send low balance alert',
                        },
                    ],
                    default: 'transactionAlert',
                },
                {
                    displayName: 'Recipient Email',
                    name: 'email',
                    type: 'string',
                    default: '',
                    placeholder: 'user@example.com',
                    description: 'Email address to send notification to',
                },
                {
                    displayName: 'Account ID',
                    name: 'accountId',
                    type: 'string',
                    default: '',
                    placeholder: 'cmfh8lsw40000dm2l76wgzdxq',
                    description: 'The account ID related to this notification',
                },
                {
                    displayName: 'Amount',
                    name: 'amount',
                    type: 'number',
                    displayOptions: {
                        show: {
                            operation: ['transactionAlert', 'fraudAlert'],
                        },
                    },
                    default: 0,
                    placeholder: '100.00',
                    description: 'Transaction amount',
                },
                {
                    displayName: 'Message Template',
                    name: 'template',
                    type: 'options',
                    options: [
                        {
                            name: 'Standard',
                            value: 'standard',
                            description: 'Standard notification template',
                        },
                        {
                            name: 'Urgent',
                            value: 'urgent',
                            description: 'Urgent notification template',
                        },
                        {
                            name: 'Custom',
                            value: 'custom',
                            description: 'Custom message template',
                        },
                    ],
                    default: 'standard',
                },
                {
                    displayName: 'Custom Message',
                    name: 'customMessage',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    displayOptions: {
                        show: {
                            template: ['custom'],
                        },
                    },
                    default: '',
                    placeholder: 'Your custom notification message...',
                    description: 'Custom notification message',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                const email = this.getNodeParameter('email', i);
                const accountId = this.getNodeParameter('accountId', i);
                const template = this.getNodeParameter('template', i);
                // Get credentials
                const credentials = await this.getCredentials('bankingApi');
                const baseUrl = credentials.baseUrl;
                let notificationData = {
                    email,
                    accountId,
                    operation,
                    template,
                    timestamp: new Date().toISOString(),
                };
                switch (operation) {
                    case 'transactionAlert':
                        const amount = this.getNodeParameter('amount', i);
                        notificationData = {
                            ...notificationData,
                            amount,
                            subject: `Transaction Alert - $${amount}`,
                            message: `A transaction of $${amount} has been processed for your account.`,
                        };
                        break;
                    case 'fraudAlert':
                        const fraudAmount = this.getNodeParameter('amount', i);
                        notificationData = {
                            ...notificationData,
                            amount: fraudAmount,
                            subject: `🚨 Fraud Alert - Large Transaction`,
                            message: `A large transaction of $${fraudAmount} was detected and requires review.`,
                            priority: 'high',
                        };
                        break;
                    case 'accountWelcome':
                        notificationData = {
                            ...notificationData,
                            subject: `Welcome to Your New Banking Account`,
                            message: `Your new banking account has been created successfully. Account ID: ${accountId}`,
                        };
                        break;
                    case 'lowBalance':
                        notificationData = {
                            ...notificationData,
                            subject: `Low Balance Alert`,
                            message: `Your account balance is running low. Please consider making a deposit.`,
                            priority: 'medium',
                        };
                        break;
                    default:
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
                }
                // If custom template, use custom message
                if (template === 'custom') {
                    const customMessage = this.getNodeParameter('customMessage', i);
                    notificationData.message = customMessage;
                }
                // In a real implementation, you would send the notification here
                // For now, we'll just return the notification data
                returnData.push({
                    json: {
                        success: true,
                        notification: notificationData,
                        sent: true,
                        provider: 'banking-notification-system',
                    },
                    pairedItem: {
                        item: i,
                    },
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        pairedItem: {
                            item: i,
                        },
                    });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)));
            }
        }
        return [returnData];
    }
}
exports.BankingNotification = BankingNotification;
