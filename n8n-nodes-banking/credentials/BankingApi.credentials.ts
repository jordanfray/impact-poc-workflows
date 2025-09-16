import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BankingApi implements ICredentialType {
	name = 'bankingApi';
	displayName = 'Banking API';
	documentationUrl = 'https://docs.your-banking-app.com/api';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:3000',
			placeholder: 'http://localhost:3000',
			description: 'The base URL of your banking API',
		},
		{
			displayName: 'API Key (Supabase Access Token)',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'your-supabase-access-token',
			description: 'Your Supabase access token for API authentication',
		},
	];

	// Use generic authentication
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Test the credentials
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/accounts',
			method: 'GET',
		},
	};
}
