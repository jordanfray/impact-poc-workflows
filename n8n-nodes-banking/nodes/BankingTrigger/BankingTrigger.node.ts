import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionType,
} from 'n8n-workflow';

export class BankingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Impact Triggers',
		name: 'impactTriggers',
		icon: 'fa:bolt',
		group: ['trigger'],
		version: 1,
		description: 'Triggers on Impact banking events',
		defaults: {
			name: 'Impact Triggers',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{$parameter["eventType"]}}',
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				options: [
					{
						name: 'Transaction Cleared',
						value: 'transaction-cleared',
						description: 'Triggers when a transaction is completed and cleared',
					},
					{
						name: 'Account Created',
						value: 'account-created',
						description: 'Triggers when a new account is created',
					},
					{
						name: 'Transfer Complete',
						value: 'transfer-complete',
						description: 'Triggers when a transfer is completed',
					},
					{
						name: 'Large Transaction',
						value: 'large-transaction',
						description: 'Triggers for transactions above a threshold',
					},
				],
				default: 'transaction-cleared',
				description: 'Select the banking event type to trigger on',
			},
			{
				displayName: 'Minimum Amount',
				name: 'minAmount',
				type: 'number',
				displayOptions: {
					show: {
						eventType: ['transaction-cleared', 'transfer-complete', 'large-transaction'],
					},
				},
				default: 0,
				placeholder: '100.00',
				description: 'Only trigger for transactions above this amount (optional)',
			},
			{
				displayName: 'Account Filter',
				name: 'accountFilter',
				type: 'string',
				default: '',
				placeholder: 'cmfh8lsw40000dm2l76wgzdxq',
				description: 'Only trigger for specific account ID (optional - leave blank for all accounts)',
			},
			{
				displayName: 'Response',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'immediately',
						description: 'Respond immediately',
					},
					{
						name: 'When Workflow Finishes',
						value: 'lastNode',
						description: 'Respond when workflow completes',
					},
				],
				default: 'immediately',
				description: 'When to respond to the webhook call',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const eventType = this.getNodeParameter('eventType') as string;
		const minAmount = this.getNodeParameter('minAmount') as number;
		const accountFilter = this.getNodeParameter('accountFilter') as string;

		const body = this.getBodyData();
		const headers = this.getHeaderData();
		const query = this.getQueryData();
		const webhookPath = this.getWebhookName();

		// Validate the incoming data
		if (!body || typeof body !== 'object') {
			return {
				webhookResponse: {
					status: 400,
					body: { error: 'Invalid request body' },
				},
			};
		}

		const eventData = body as any;

		// Apply filters
		let shouldTrigger = true;

		// Account filter
		if (accountFilter && eventData.accountId !== accountFilter) {
			shouldTrigger = false;
		}

		// Amount filter
		if (minAmount > 0 && eventData.amount && eventData.amount < minAmount) {
			shouldTrigger = false;
		}

		if (!shouldTrigger) {
			return {
				webhookResponse: {
					status: 200,
					body: { message: 'Event filtered out' },
				},
			};
		}

		// Enrich the data with banking context
		const enrichedData = {
			...eventData,
			eventType: eventType,
			triggeredAt: new Date().toISOString(),
			source: 'banking-application',
			filters: {
				minAmount: minAmount || null,
				accountFilter: accountFilter || null,
			},
			metadata: {
				headers: headers,
				query: query,
			},
		};

		return {
			workflowData: [
				[
					{
						json: enrichedData,
					},
				],
			],
			webhookResponse: {
				status: 200,
				body: {
					message: 'Banking event received and processed',
					eventType: eventType,
					triggeredAt: enrichedData.triggeredAt,
				},
			},
		};
	}
}
