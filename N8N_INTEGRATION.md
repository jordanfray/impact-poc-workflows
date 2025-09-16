# n8n Integration Guide

This guide explains how to integrate [n8n workflow automation](https://github.com/n8n-io/n8n) into your banking POC application.

## 🚀 Quick Start

### 1. Start n8n

Choose the method that works for your system:

#### Option A: NPM Installation (Recommended - No Docker Required)
```bash
# Install n8n globally
npm install -g n8n

# Start n8n on port 5678
n8n start --tunnel
```

#### Option B: NPX (No Installation Required)
```bash
# Run n8n directly with npx
npx n8n
```

#### Option C: Docker (if Docker is available)
```bash
# Start n8n as standalone container
docker run -d --name n8n_poc -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n

# Or with docker compose (if available)
docker compose up -d
```

#### Option D: Local Development
```bash
# Clone and run from source (for development)
git clone https://github.com/n8n-io/n8n.git
cd n8n
npm install
npm run build
npm run start
```

### 2. Access n8n Editor

Open [http://localhost:5678](http://localhost:5678) in your browser.

**Setup:**
- First time: Create an admin account
- No default credentials needed for NPM/NPX installation

### 3. Configure Test Mode (Development)

For development and testing, set the test mode environment variable:

```bash
# Add to your .env file
echo "N8N_TEST_MODE=true" >> .env

# Restart your Next.js server
npm run dev
```

With test mode enabled, your banking APIs will send webhooks to:
- `http://localhost:5678/webhook-test/transaction-notification`
- `http://localhost:5678/webhook-test/fraud-detection`
- `http://localhost:5678/webhook-test/account-created`
- `http://localhost:5678/webhook-test/card-issued`

### 4. Create Banking Automation Workflows

## 🏦 Banking Automation Use Cases

### Fraud Detection Workflow
**Trigger:** Large transactions (>$10,000)
**Actions:**
- Send alert email to admin
- Flag account for review
- Create compliance report
- Notify customer via SMS

### Transaction Notifications
**Trigger:** Any transaction completed
**Actions:**
- Send email receipt to customer
- Update external accounting system
- Log to audit trail
- Send push notification

### Account Management
**Trigger:** New account created
**Actions:**
- Send welcome email with account details
- Create initial compliance records
- Set up default notifications
- Sync with CRM system

### Card Issuance Automation
**Trigger:** Virtual card issued
**Actions:**
- Send card details via secure email
- Create activation workflow
- Set spending limits
- Enable transaction monitoring

## 🔧 Setting Up Webhooks in n8n

### 1. Create a New Workflow

1. Open n8n editor at [http://localhost:5678](http://localhost:5678)
2. Click "Add workflow"
3. Add a "Webhook" trigger node

### 2. Configure Webhook Triggers

#### Fraud Detection Webhook
- **Path:** `/webhook/fraud-detection`
- **Method:** POST
- **Expected Data:**
  ```json
  {
    "accountId": "string",
    "amount": 15000,
    "type": "DEPOSIT",
    "metadata": {
      "trigger": "large_amount"
    }
  }
  ```

#### Transaction Notification Webhook
- **Path:** `/webhook/transaction-notification`
- **Method:** POST
- **Expected Data:**
  ```json
  {
    "accountId": "string",
    "amount": 1000,
    "type": "TRANSFER"
  }
  ```

#### Account Creation Webhook
- **Path:** `/webhook/account-created`
- **Method:** POST
- **Expected Data:**
  ```json
  {
    "accountId": "string",
    "amount": 0,
    "type": "DEPOSIT",
    "metadata": {
      "event": "account_created"
    }
  }
  ```

#### Card Issuance Webhook
- **Path:** `/webhook/card-issued`
- **Method:** POST
- **Expected Data:**
  ```json
  {
    "accountId": "string",
    "amount": 0,
    "type": "DEPOSIT",
    "metadata": {
      "event": "card_issued",
      "cardId": "string"
    }
  }
  ```

## 🔗 Integration Points

### Your Banking App → n8n
Your application automatically triggers n8n workflows via webhooks when:
- ✅ Transactions are created (deposits, transfers, withdrawals)
- ✅ Accounts are created
- ✅ Cards are issued
- ✅ Large transactions occur (fraud detection)

### n8n → External Services
n8n can then automate actions like:
- 📧 **Email notifications** (SendGrid, Gmail, Outlook)
- 📱 **SMS alerts** (Twilio, AWS SNS)
- 📊 **Reporting** (Google Sheets, Airtable, databases)
- 🔗 **API integrations** (CRM, accounting, compliance systems)
- 🤖 **AI processing** (OpenAI, custom models)

## 🛠 Advanced Features

### AI-Powered Automations
n8n has native AI capabilities that could enhance your banking POC:

- **Fraud Detection AI:** Analyze transaction patterns with AI models
- **Customer Support:** AI-powered chatbot responses
- **Risk Assessment:** Automated credit scoring and risk analysis
- **Document Processing:** AI-powered KYC document verification

### Custom Banking Nodes
You can create custom n8n nodes for banking-specific operations:
- Unit.co API integration
- Banking compliance checks
- Custom fraud detection algorithms
- Regulatory reporting

## 🔒 Security Considerations

### Production Setup
For production deployment:

1. **Authentication:** Replace basic auth with proper OAuth/SSO
2. **HTTPS:** Use SSL certificates for secure communication
3. **Environment Variables:** Store sensitive data in environment variables
4. **Network Security:** Use VPN or private networks
5. **Database Security:** Separate n8n database from banking data

### Webhook Security
- Use webhook authentication tokens
- Validate payload signatures
- Implement rate limiting
- Monitor webhook calls

## 📈 Monitoring & Analytics

### Workflow Monitoring
n8n provides built-in monitoring for:
- Workflow execution logs
- Success/failure rates
- Performance metrics
- Error tracking

### Banking-Specific Metrics
Track automation performance:
- Transaction processing time
- Fraud detection accuracy
- Customer notification delivery rates
- Compliance report generation

## 🚀 Getting Started Checklist

- [ ] Start n8n with Docker Compose
- [ ] Access n8n editor at localhost:5678
- [ ] Create your first webhook workflow
- [ ] Test with a sample transaction
- [ ] Set up email notifications
- [ ] Configure fraud detection rules
- [ ] Add customer communication workflows
- [ ] Set up compliance reporting

## 💡 Example Workflows

### Simple Transaction Alert
1. **Webhook Trigger** → receives transaction data
2. **If Node** → checks if amount > $1000
3. **Email Node** → sends alert to admin
4. **HTTP Request** → logs to external system

### Fraud Detection Pipeline
1. **Webhook Trigger** → receives transaction data
2. **AI Node** → analyzes transaction patterns
3. **If Node** → checks fraud score
4. **Multiple Actions:**
   - Flag account
   - Send admin alert
   - Notify customer
   - Create compliance record

The n8n integration is now ready to enhance your banking POC with powerful automation capabilities!
