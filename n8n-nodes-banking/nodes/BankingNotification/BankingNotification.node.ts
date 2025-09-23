import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

export class BankingNotification implements INodeType {
	description: INodeTypeDescription = {
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
					{
						name: 'Custom Notification',
						value: 'custom',
						description: 'Send a custom notification (title and description)',
						action: 'Send custom notification',
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
				displayOptions: {
					show: {
						operation: ['transactionAlert','fraudAlert','accountWelcome','lowBalance']
					}
				},
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
						operation: ['transactionAlert','fraudAlert','accountWelcome','lowBalance'],
						template: ['custom'],
					},
				},
				default: '',
				placeholder: 'Your custom notification message...',
				description: 'Custom notification message',
			},
			{
				displayName: 'Title',
				name: 'customTitle',
				type: 'string',
				default: '',
				placeholder: 'Notification title',
				displayOptions: {
					show: { operation: ['custom'] }
				},
			},
			{
				displayName: 'Description',
				name: 'customDescription',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'Notification description',
				displayOptions: {
					show: { operation: ['custom'] }
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0);

        for (let i = 0; i < items.length; i++) {
            try {

                // Get credentials
                const credentials = await this.getCredentials('bankingApi');
                const baseUrl = credentials.baseUrl as string;
                const apiKey = credentials.apiKey as string;

				let notificationData: any = {
                    operation,
					timestamp: new Date().toISOString(),
				};

                switch (operation) {
					case 'transactionAlert':
                        {
                            const email = this.getNodeParameter('email', i, '') as string;
                            const accountId = this.getNodeParameter('accountId', i, '') as string;
                            const template = this.getNodeParameter('template', i, 'standard') as string;
                            notificationData = { ...notificationData, email, accountId, template };
                        }
						const amount = this.getNodeParameter('amount', i) as number;
						notificationData = {
							...notificationData,
							amount,
							subject: `Transaction Alert - $${amount}`,
							message: `A transaction of $${amount} has been processed for your account.`,
						};
						break;

					case 'fraudAlert':
                        {
                            const email = this.getNodeParameter('email', i, '') as string;
                            const accountId = this.getNodeParameter('accountId', i, '') as string;
                            const template = this.getNodeParameter('template', i, 'standard') as string;
                            notificationData = { ...notificationData, email, accountId, template };
                        }
						const fraudAmount = this.getNodeParameter('amount', i) as number;
						notificationData = {
							...notificationData,
							amount: fraudAmount,
							subject: `🚨 Fraud Alert - Large Transaction`,
							message: `A large transaction of $${fraudAmount} was detected and requires review.`,
							priority: 'high',
						};
						break;

                    case 'accountWelcome':
                        {
                            const email = this.getNodeParameter('email', i, '') as string;
                            const accId = this.getNodeParameter('accountId', i, '') as string;
                            const template = this.getNodeParameter('template', i, 'standard') as string;
                            notificationData = {
                                ...notificationData,
                                email,
                                accountId: accId,
                                template,
                                subject: `Welcome to Your New Banking Account`,
                                message: `Your new banking account has been created successfully. Account ID: ${accId}`,
                            };
                        }
                        break;

					case 'lowBalance':
                        {
                            const email = this.getNodeParameter('email', i, '') as string;
                            const accountId = this.getNodeParameter('accountId', i, '') as string;
                            const template = this.getNodeParameter('template', i, 'standard') as string;
                            notificationData = { ...notificationData, email, accountId, template };
                        }
						notificationData = {
							...notificationData,
							subject: `Low Balance Alert`,
							message: `Your account balance is running low. Please consider making a deposit.`,
							priority: 'medium',
						};
						break;

                    case 'custom':
                        const customTitle = this.getNodeParameter('customTitle', i) as string;
                        const customDesc = this.getNodeParameter('customDescription', i) as string;
                        notificationData = {
                            title: customTitle,
                            message: customDesc,
                        } as any;
                        break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

                // For legacy template option on non-custom operations, allow overriding message when provided
                if (operation !== 'custom') {
                    const customMessage = this.getNodeParameter('customMessage', i, '') as string;
                    if (customMessage) notificationData.message = customMessage;
                }

                // Send to Impact notifications API
                const created = await this.helpers.request({
                    method: 'POST',
                    url: `${baseUrl}/api/notifications`,
                    headers: {
                        'X-API-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: {
                        title: (notificationData.title || notificationData.subject || 'Notification') as string,
                        description: (notificationData.message || notificationData.description || 'Notification received') as string,
                    },
                    json: true,
                });

                returnData.push({
                    json: { success: true, created },
                    pairedItem: { item: i },
                });
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
