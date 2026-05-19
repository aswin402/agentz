#!/bin/bash
set -e

# =============================================================================
# AgentZ Uninstaller (Local Setup)
# =============================================================================
# Removes AgentZ OpenCode agent files and CLI alias.
# Does NOT delete the repo — this is a local setup.
# Run from the repo root: ./uninstall.sh
# =============================================================================

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
OPENCODE_AGENT_DIR="$OPENCODE_CONFIG_DIR/agent"   # singular — OpenCode's real dir

echo "🗑️  Uninstalling AgentZ..."
echo ""

echo "⚠️  This will remove:"
echo "   - OpenCode agent:        $OPENCODE_AGENT_DIR/agentz.md"
echo "   - OpenCode vision agent: $OPENCODE_AGENT_DIR/agentz-vision.md"
echo "   - OpenCode config:       $OPENCODE_CONFIG_DIR/agentz-config.json"
echo "   - Shell alias:           agentz alias from ~/.bashrc / ~/.zshrc"
echo ""
echo "   (The repo at $CURRENT_DIR will NOT be deleted)"
echo ""

read -p "Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# ─── Step 1: Remove OpenCode agent files ─────────────────────────────────────
echo "🤖 Removing OpenCode agent files..."
rm -f "$OPENCODE_AGENT_DIR/agentz.md" 2>/dev/null && echo "   ✓ Removed agentz.md" || echo "   — agentz.md not found"
rm -f "$OPENCODE_AGENT_DIR/agentz-vision.md" 2>/dev/null && echo "   ✓ Removed agentz-vision.md" || echo "   — agentz-vision.md not found"

# Also clean up legacy plural agents/ dir if it exists
if [ -f "$OPENCODE_CONFIG_DIR/agents/agentz.md" ]; then
    rm -f "$OPENCODE_CONFIG_DIR/agents/agentz.md" && echo "   ✓ Removed legacy agents/agentz.md"
fi
if [ -f "$OPENCODE_CONFIG_DIR/agents/agentz.md.bak" ]; then
    rm -f "$OPENCODE_CONFIG_DIR/agents/agentz.md.bak" && echo "   ✓ Removed legacy agents/agentz.md.bak"
fi

# ─── Step 2: Remove OpenCode config ──────────────────────────────────────────
echo "⚙️  Removing OpenCode config..."
rm -f "$OPENCODE_CONFIG_DIR/agentz-config.json" 2>/dev/null && echo "   ✓ Removed agentz-config.json" || echo "   — agentz-config.json not found"

# ─── Step 3: Remove legacy bin symlink ───────────────────────────────────────
if [ -f "$OPENCODE_CONFIG_DIR/bin/agentz" ]; then
    rm -f "$OPENCODE_CONFIG_DIR/bin/agentz"
    echo "   ✓ Removed bin/agentz symlink"
fi

# ─── Step 4: Remove npm global package if installed ──────────────────────────
if npm list -g agentz --depth=0 &>/dev/null 2>&1; then
    echo "📦 Removing global npm package..."
    npm uninstall -g agentz 2>/dev/null || true
    echo "   ✓ Removed global npm package"
fi

# ─── Step 5: Clean up shell aliases ──────────────────────────────────────────
echo "🧹 Cleaning up shell configs..."
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ]; then
        # Remove the AgentZ block (comment + alias line)
        sed -i '/^# AgentZ$/d' "$rc" 2>/dev/null || true
        sed -i '/^alias agentz=/d' "$rc" 2>/dev/null || true
        # Remove any leftover PATH lines from old installs
        sed -i '/\.agentz:/d' "$rc" 2>/dev/null || true
        sed -i '/opencode\/bin/d' "$rc" 2>/dev/null || true
        echo "   ✓ Cleaned $rc"
    fi
done

echo ""
echo "✅ AgentZ uninstalled!"
echo ""
echo "   Repo kept at: $CURRENT_DIR"
echo "   To reinstall: ./install.sh"
echo ""
echo "📝 Reload your shell:"
echo "   source ~/.bashrc   # or source ~/.zshrc"
echo ""
echo "👋 Thanks for using AgentZ!"
echo ""