"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingApi = void 0;
class BankingApi {
    constructor() {
        this.name = 'bankingApi';
        this.displayName = 'Banking API';
        this.documentationUrl = 'https://docs.your-banking-app.com/api';
        this.properties = [
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
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        // Test the credentials
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/accounts',
                method: 'GET',
            },
        };
    }
}
exports.BankingApi = BankingApi;
