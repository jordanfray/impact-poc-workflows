#!/bin/bash

echo "🏦 Setting up Custom Banking Nodes for n8n"
echo "==========================================="
echo

# Check if n8n is installed
if ! command -v n8n &> /dev/null; then
    echo "❌ n8n is not installed. Please run: npm run setup:n8n"
    exit 1
fi

echo "✅ n8n is installed"
echo

# Navigate to custom nodes directory
cd n8n-nodes-banking

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🔨 Building custom nodes..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Custom nodes built successfully"
else
    echo "❌ Failed to build custom nodes"
    exit 1
fi

echo "🔗 Linking custom nodes to n8n..."
npm link

echo "🔧 Setting up custom nodes path..."
CUSTOM_NODES_PATH="$(cd .. && pwd)/n8n-nodes-banking"
echo "N8N_CUSTOM_EXTENSIONS=$CUSTOM_NODES_PATH" >> ../.env

echo "🎯 Custom Banking Nodes are ready!"
echo
echo "Available Nodes:"
echo "  🏦 Banking Account    - Account management operations"
echo "  💸 Banking Transfer   - Money transfer operations"
echo "  🔔 Banking Notification - Send banking notifications"
echo
echo "Next steps:"
echo "1. Restart n8n with custom nodes: export N8N_CUSTOM_EXTENSIONS=\$(pwd)/n8n-nodes-banking && n8n start --tunnel"
echo "2. Open n8n: http://localhost:5678"
echo "3. Look for 'Banking' nodes in the node palette"
echo "4. Set up Banking API credentials in n8n settings"
echo ""
echo "🔧 Environment variable set:"
echo "N8N_CUSTOM_EXTENSIONS=$CUSTOM_NODES_PATH"
echo
echo "🚀 Your banking automation nodes are ready to use!"
