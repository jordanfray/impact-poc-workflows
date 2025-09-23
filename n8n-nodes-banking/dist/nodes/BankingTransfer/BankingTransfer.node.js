"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingTransfer = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class BankingTransfer {
    constructor() {
        this.description = {
            displayName: 'Impact Transfer',
            name: 'impactTransfer',
            icon: 'fa:exchange-alt',
            group: ['Impact'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Transfer money between banking accounts',
            defaults: {
                name: 'Banking Transfer',
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
                            name: 'Transfer Money',
                            value: 'transfer',
                            description: 'Transfer money from one account to another',
                            action: 'Transfer money between accounts',
                        },
                    ],
                    default: 'transfer',
                },
                {
                    displayName: 'From Account ID',
                    name: 'fromAccountId',
                    type: 'string',
                    displayOptions: {
                        show: {
                            operation: ['transfer'],
                        },
                    },
                    default: '',
                    placeholder: 'cmfh8lsw40000dm2l76wgzdxq',
                    description: 'The ID of the account to transfer money from',
                },
                {
                    displayName: 'To Account ID',
                    name: 'toAccountId',
                    type: 'string',
                    displayOptions: {
                        show: {
                            operation: ['transfer'],
                        },
                    },
                    default: '',
                    placeholder: 'cmfh9abc12345dm2l76wgzdxq',
                    description: 'The ID of the account to transfer money to',
                },
                {
                    displayName: 'Amount',
                    name: 'amount',
                    type: 'number',
                    displayOptions: {
                        show: {
                            operation: ['transfer'],
                        },
                    },
                    default: 0,
                    placeholder: '100.00',
                    description: 'Amount to transfer (in dollars)',
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            operation: ['transfer'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Description',
                            name: 'description',
                            type: 'string',
                            default: '',
                            description: 'Optional description for the transfer',
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        var _a;
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        // Generate or reuse a correlation id for this workflow run
        const globalData = this.getWorkflowStaticData('global');
        let correlationId = (globalData && globalData.correlationId);
        if (!correlationId) {
            correlationId = `${this.getNode().id}:${Date.now()}`;
            if (globalData)
                globalData.correlationId = correlationId;
        }
        for (let i = 0; i < items.length; i++) {
            const idempotencyKey = `${correlationId}:${i}:${operation}`;
            try {
                if (operation === 'transfer') {
                    const fromAccountId = this.getNodeParameter('fromAccountId', i);
                    const toAccountId = this.getNodeParameter('toAccountId', i);
                    const amount = this.getNodeParameter('amount', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    // Get credentials
                    const credentials = await this.getCredentials('bankingApi');
                    const baseUrl = credentials.baseUrl;
                    const apiKey = credentials.apiKey;
                    // Make the transfer API call
                    const response = await this.helpers.request({
                        method: 'POST',
                        url: `${baseUrl}/api/accounts/${fromAccountId}/transfer`,
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                            'Idempotency-Key': idempotencyKey,
                            'X-Correlation-Id': correlationId,
                        },
                        body: {
                            toAccountId,
                            amount,
                            description: additionalFields.description,
                        },
                        json: true,
                    });
                    returnData.push({
                        json: {
                            success: true,
                            transferId: (_a = response.fromTransferTransaction) === null || _a === void 0 ? void 0 : _a.id,
                            fromAccount: response.fromAccount,
                            toAccount: response.toAccount,
                            amount,
                            message: response.message,
                            timestamp: new Date().toISOString(),
                        },
                        pairedItem: {
                            item: i,
                        },
                    });
                }
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
exports.BankingTransfer = BankingTransfer;
