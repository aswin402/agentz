#!/bin/bash
set -e

# Helper script to sync agents from .agentz/agents/ to OpenCode
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Running AgentZ sync..."
bash "$CURRENT_DIR/update.sh" sync
