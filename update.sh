#!/bin/bash
set -e

# =============================================================================
# AgentZ Updater (Local Setup)
# =============================================================================
# Rebuilds AgentZ from source and re-syncs all config/agent files.
# Run from the repo root: ./update.sh
# =============================================================================

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
OPENCODE_AGENT_DIR="$OPENCODE_CONFIG_DIR/agent"   # singular — OpenCode's real dir
AGENTZ_RUNTIME_DIR="$CURRENT_DIR/.agentz"

echo "🔄 Updating AgentZ..."
echo ""

# ─── Step 1: Ensure directories exist ────────────────────────────────────────
echo "📁 Ensuring directories..."
mkdir -p "$OPENCODE_AGENT_DIR"
mkdir -p "$AGENTZ_RUNTIME_DIR/memory"
mkdir -p "$AGENTZ_RUNTIME_DIR/skills"
mkdir -p "$AGENTZ_RUNTIME_DIR/tasks"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/active/subagent-status"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/sessions"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/history"

# ─── Step 2: Verify OpenCode agent files ─────────────────────────────────────
echo "🤖 Checking OpenCode agent files..."

if [ -f "$OPENCODE_AGENT_DIR/agentz.md" ]; then
    echo "   ✓ agentz (primary) present"
else
    echo "   ⚠️  agentz.md missing from $OPENCODE_AGENT_DIR — image/vision delegation won't work"
fi

if [ -f "$OPENCODE_AGENT_DIR/agentz-vision.md" ]; then
    echo "   ✓ agentz-vision (subagent) present"
else
    echo "   ⚠️  agentz-vision.md missing — vision subagent not available"
fi

# ─── Step 3: Sync OpenCode config ────────────────────────────────────────────
echo "⚙️  Syncing OpenCode configuration..."
if [ -f "$AGENTZ_RUNTIME_DIR/config/config.json" ]; then
    cp "$AGENTZ_RUNTIME_DIR/config/config.json" "$OPENCODE_CONFIG_DIR/agentz-config.json"
    echo "   ✓ Config synced → $OPENCODE_CONFIG_DIR/agentz-config.json"
else
    echo "   ⚠️  No .agentz/config/config.json — skipping config sync"
fi

# ─── Step 4: Re-install dependencies ─────────────────────────────────────────
echo "📦 Installing npm dependencies..."
cd "$CURRENT_DIR"
npm install --silent 2>/dev/null || npm install

# ─── Step 5: Rebuild ─────────────────────────────────────────────────────────
echo "🔨 Rebuilding..."
npm run build

# ─── Step 6: Verify CLI alias is set ─────────────────────────────────────────
echo "🔗 Verifying agentz CLI alias..."

AGENTZ_CLI="$CURRENT_DIR/dist/cli/index.js"

for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ]; then
        if grep -q "alias agentz=" "$rc" 2>/dev/null; then
            echo "   ✓ agentz alias present in $rc"
        else
            {
                echo ""
                echo "# AgentZ"
                echo "alias agentz='node $AGENTZ_CLI'"
            } >> "$rc"
            echo "   ✓ Added agentz alias to $rc"
        fi
    fi
done

# ─── Step 7: Quick sanity check ──────────────────────────────────────────────
echo "🔍 Sanity check..."

if [ -f "$CURRENT_DIR/dist/cli/index.js" ]; then
    echo "   ✓ dist/cli/index.js built"
else
    echo "   ❌ Build output missing — check npm run build output above"
    exit 1
fi

if [ -f "$OPENCODE_AGENT_DIR/agentz.md" ]; then
    echo "   ✓ OpenCode agent registered"
fi

# Check opencode can see agents
if command -v opencode &>/dev/null; then
    AGENT_LIST=$(opencode agent list 2>/dev/null || echo "")
    if echo "$AGENT_LIST" | grep -q "agentz"; then
        echo "   ✓ agentz visible in opencode agent list"
    else
        echo "   ⚠️  agentz not detected by opencode — restart OpenCode to pick up changes"
    fi
    if echo "$AGENT_LIST" | grep -q "agentz-vision"; then
        echo "   ✓ agentz-vision visible in opencode agent list"
    fi
fi

echo ""
echo "✅ AgentZ updated!"
echo ""
echo "   Repo:          $CURRENT_DIR"
echo "   Primary agent: $OPENCODE_AGENT_DIR/agentz.md"
echo "   Vision agent:  $OPENCODE_AGENT_DIR/agentz-vision.md"
echo "   Config:        $OPENCODE_CONFIG_DIR/agentz-config.json"
echo ""
echo "🚀 Changes are live — restart OpenCode if agent prompts were edited."
echo ""