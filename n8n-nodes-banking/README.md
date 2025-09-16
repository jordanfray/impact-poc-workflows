# n8n Banking Nodes

Custom n8n nodes for banking operations integration.

## Features

### Banking Transfer Node
- Transfer money between accounts
- Automatic balance validation
- Transaction logging

### Banking Account Node
- Create new accounts
- Get account information
- Check account balances
- List all accounts
- Deposit money

### Banking Notification Node
- Transaction alerts
- Fraud detection notifications
- Account welcome messages
- Low balance alerts

## Installation

### Option 1: Local Development
```bash
# Navigate to the custom nodes directory
cd n8n-nodes-banking

# Install dependencies
npm install

# Build the nodes
npm run build

# Link to your n8n installation
npm link
```

### Option 2: Install in n8n
```bash
# In your n8n directory
npm install ./n8n-nodes-banking
```

### Option 3: Community Package (Future)
```bash
# Once published to npm
npm install n8n-nodes-banking
```

## Configuration

### 1. Set up Banking API Credentials
In n8n, go to **Settings > Credentials** and create a new "Banking API" credential:

- **Base URL**: `http://localhost:3000` (your banking app)
- **API Key**: Your Supabase access token

### 2. Use in Workflows
The banking nodes will appear in the n8n node palette under the "Banking" category:

- 🏦 **Banking Account** - Account management operations
- 💸 **Banking Transfer** - Money transfer operations  
- 🔔 **Banking Notification** - Send banking notifications

## Example Workflows

### Automated Transfer on External Event
1. **Webhook Trigger** → Receives external event
2. **Banking Account** → Get account balance
3. **If Node** → Check if sufficient funds
4. **Banking Transfer** → Move money between accounts
5. **Banking Notification** → Send confirmation email

### Fraud Detection Pipeline
1. **Webhook Trigger** → Large transaction detected
2. **Banking Account** → Get account details
3. **Banking Notification** → Send fraud alert
4. **HTTP Request** → Log to external compliance system

### Welcome New Customer
1. **Webhook Trigger** → New account created
2. **Banking Account** → Get account information
3. **Banking Notification** → Send welcome message
4. **Banking Transfer** → Add welcome bonus

## API Integration

Your banking application APIs are already configured to work with these nodes:

- **Transfers**: `/api/accounts/[id]/transfer`
- **Accounts**: `/api/accounts`
- **Transactions**: `/api/accounts/[id]/transactions`
- **Cards**: `/api/cards`

## Development

```bash
# Watch for changes during development
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Support

For issues or feature requests, contact the Impact team at Gloo.
