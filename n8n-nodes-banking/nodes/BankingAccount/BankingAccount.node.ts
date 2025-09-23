import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

export class BankingAccount implements INodeType {
	description: INodeTypeDescription = {
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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0);

		// Generate or reuse a correlation id for this workflow run
		const globalData = this.getWorkflowStaticData('global') as any;
		let correlationId = (globalData && globalData.correlationId) as string;
		if (!correlationId) {
			correlationId = `${this.getNode().id}:${Date.now()}`;
			if (globalData) globalData.correlationId = correlationId;
		}

		for (let i = 0; i < items.length; i++) {
			const idempotencyKey = `${correlationId}:${i}:${operation}`;
			try {
				// Get credentials
				const credentials = await this.getCredentials('bankingApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				let responseData;

				switch (operation) {
					case 'create':
						const nickname = this.getNodeParameter('nickname', i) as string;
                        responseData = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/api/accounts`,
							headers: {
                                'X-API-Key': apiKey,
								'Content-Type': 'application/json',
								'Idempotency-Key': idempotencyKey,
								'X-Correlation-Id': correlationId,
							},
							body: { nickname },
							json: true,
						});
						break;

					case 'get':
						const accountId = this.getNodeParameter('accountId', i) as string;
                        responseData = await this.helpers.request({
							method: 'GET',
							url: `${baseUrl}/api/accounts/${accountId}`,
							headers: {
                                'X-API-Key': apiKey,
								'Idempotency-Key': idempotencyKey,
								'X-Correlation-Id': correlationId,
							},
							json: true,
						});
						break;

					case 'balance':
						const balanceAccountId = this.getNodeParameter('accountId', i) as string;
                        const accountData = await this.helpers.request({
							method: 'GET',
							url: `${baseUrl}/api/accounts/${balanceAccountId}`,
							headers: {
                                'X-API-Key': apiKey,
								'Idempotency-Key': idempotencyKey,
								'X-Correlation-Id': correlationId,
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
                                'X-API-Key': apiKey,
								'Idempotency-Key': idempotencyKey,
								'X-Correlation-Id': correlationId,
							},
							json: true,
						});
						break;

					case 'deposit':
						const depositAccountId = this.getNodeParameter('accountId', i) as string;
						const depositAmount = this.getNodeParameter('amount', i) as number;
                        responseData = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/api/accounts/${depositAccountId}/transactions`,
							headers: {
                                'X-API-Key': apiKey,
								'Content-Type': 'application/json',
								'Idempotency-Key': idempotencyKey,
								'X-Correlation-Id': correlationId,
							},
							body: {
								amount: depositAmount,
								type: 'DEPOSIT',
							},
							json: true,
						});
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
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
			} catch (error) {
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
				throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)));
			}
		}

		return [returnData];
	}
}
