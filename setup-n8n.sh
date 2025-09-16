#!/bin/bash

echo "🤖 n8n Workflow Automation Setup"
echo "================================="
echo

# Check if n8n is already installed
if command -v n8n &> /dev/null; then
    echo "✅ n8n is already installed globally"
    echo "📍 Version: $(n8n --version)"
    echo
    echo "To start n8n:"
    echo "  npm run n8n:start"
    echo "  or: n8n start --tunnel"
    echo
    echo "Then visit: http://localhost:5678"
    exit 0
fi

echo "📦 Installing n8n globally..."
echo "This may take a few minutes..."
echo

# Install n8n globally
npm install -g n8n

if [ $? -eq 0 ]; then
    echo "✅ n8n installed successfully!"
    echo "📍 Version: $(n8n --version)"
    echo
    echo "🚀 Starting n8n..."
    echo "Visit http://localhost:5678 to access the n8n editor"
    echo
    echo "Available commands:"
    echo "  npm run n8n:start    - Start n8n with tunnel"
    echo "  npm run n8n:npx      - Run n8n with npx (no installation)"
    echo "  npm run n8n:demo     - Show integration status"
    echo
    echo "🏦 Banking automation hooks are already integrated in your APIs:"
    echo "  ✅ Transaction monitoring"
    echo "  ✅ Account creation automation"
    echo "  ✅ Card issuance automation"
    echo "  ✅ Fraud detection triggers"
    echo
    echo "Next steps:"
    echo "1. Start n8n: npm run n8n:start"
    echo "2. Open http://localhost:5678"
    echo "3. Create your first workflow"
    echo "4. Set up webhook endpoints for banking automation"
    echo
else
    echo "❌ Failed to install n8n globally"
    echo "💡 Alternative: Use npx to run without installation"
    echo "   npm run n8n:npx"
    echo
fi
