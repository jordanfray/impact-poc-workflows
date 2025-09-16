"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingAccount = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class BankingAccount {
    constructor() {
        this.description = {
            displayName: 'Impact Account',
            name: 'impactAccount',
            icon: 'fa:university',
            group: ['Impact'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Manage banking accounts',
            defaults: {
                name: 'Banking Account',
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
                            name: 'Create Account',
                            value: 'create',
                            description: 'Create a new banking account',
                            action: 'Create a new account',
                        },
                        {
                            name: 'Get Account',
                            value: 'get',
                            description: 'Get account information',
                            action: 'Get account details',
                        },
                        {
                            name: 'Get Account Balance',
                            value: 'balance',
                            description: 'Get current account balance',
                            action: 'Get account balance',
                        },
                        {
                            name: 'List Accounts',
                            value: 'list',
                            description: 'List all accounts for user',
                            action: 'List all accounts',
                        },
                        {
                            name: 'Deposit Money',
                            value: 'deposit',
                            description: 'Deposit money into account',
                            action: 'Deposit money',
                        },
                    ],
                    default: 'get',
                },
                {
                    displayName: 'Account ID',
                    name: 'accountId',
                    type: 'string',
                    displayOptions: {
                        show: {
                            operation: ['get', 'balance', 'deposit'],
                        },
                    },
                    default: '',
                    placeholder: 'cmfh8lsw40000dm2l76wgzdxq',
                    description: 'The ID of the account',
                },
                {
                    displayName: 'Account Nickname',
                    name: 'nickname',
                    type: 'string',
                    displayOptions: {
                        show: {
                            operation: ['create'],
                        },
                    },
                    default: '',
                    placeholder: 'My Savings Account',
                    description: 'Nickname for the new account',
                },
                {
                    displayName: 'Amount',
                    name: 'amount',
                    type: 'number',
                    displayOptions: {
                        show: {
                            operation: ['deposit'],
                        },
                    },
                    default: 0,
                    placeholder: '100.00',
                    description: 'Amount to deposit (in dollars)',
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
                // Get credentials
                const credentials = await this.getCredentials('bankingApi');
                const baseUrl = credentials.baseUrl;
                const apiKey = credentials.apiKey;
                let responseData;
                switch (operation) {
                    case 'create':
                        const nickname = this.getNodeParameter('nickname', i);
                        responseData = await this.helpers.request({
                            method: 'POST',
                            url: `${baseUrl}/api/accounts`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: { nickname },
                            json: true,
                        });
                        break;
                    case 'get':
                        const accountId = this.getNodeParameter('accountId', i);
                        responseData = await this.helpers.request({
                            method: 'GET',
                            url: `${baseUrl}/api/accounts/${accountId}`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                        break;
                    case 'balance':
                        const balanceAccountId = this.getNodeParameter('accountId', i);
                        const accountData = await this.helpers.request({
                            method: 'GET',
                            url: `${baseUrl}/api/accounts/${balanceAccountId}`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                        responseData = {
                            accountId: balanceAccountId,
                            balance: accountData.balance,
                            nickname: accountData.nickname,
                        };
                        break;
                    case 'list':
                        responseData = await this.helpers.request({
                            method: 'GET',
                            url: `${baseUrl}/api/accounts`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                        break;
                    case 'deposit':
                        const depositAccountId = this.getNodeParameter('accountId', i);
                        const depositAmount = this.getNodeParameter('amount', i);
                        responseData = await this.helpers.request({
                            method: 'POST',
                            url: `${baseUrl}/api/accounts/${depositAccountId}/transactions`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: {
                                amount: depositAmount,
                                type: 'DEPOSIT',
                            },
                            json: true,
                        });
                        break;
                    default:
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
                }
                returnData.push({
                    json: {
                        ...responseData,
                        operation,
                        timestamp: new Date().toISOString(),
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
                            operation,
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
exports.BankingAccount = BankingAccount;
