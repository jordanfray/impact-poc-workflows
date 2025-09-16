import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

export class BankingTransfer implements INodeType {
	description: INodeTypeDescription = {
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'transfer') {
					const fromAccountId = this.getNodeParameter('fromAccountId', i) as string;
					const toAccountId = this.getNodeParameter('toAccountId', i) as string;
					const amount = this.getNodeParameter('amount', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as {
						description?: string;
					};

					// Get credentials
					const credentials = await this.getCredentials('bankingApi');
					const baseUrl = credentials.baseUrl as string;
					const apiKey = credentials.apiKey as string;

					// Make the transfer API call
					const response = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/accounts/${fromAccountId}/transfer`,
						headers: {
							'Authorization': `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
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
							transferId: response.fromTransferTransaction?.id,
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
			} catch (error) {
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
				throw new NodeOperationError(this.getNode(), error instanceof Error ? error : new Error(String(error)));
			}
		}

		return [returnData];
	}
}
