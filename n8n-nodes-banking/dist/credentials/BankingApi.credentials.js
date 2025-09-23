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
                displayName: 'Impact API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                placeholder: 'impk_xxx...',
                description: 'Your Impact application API key from Profile → API Keys',
            },
        ];
        // Use generic authentication
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'X-API-Key': '={{$credentials.apiKey}}',
                },
            },
        };
        // Test the credentials
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/accounts',
                method: 'GET',
                headers: {
                    'X-API-Key': '={{$credentials.apiKey}}',
                },
            },
        };
    }
}
exports.BankingApi = BankingApi;
