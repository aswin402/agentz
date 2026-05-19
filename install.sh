#!/bin/bash
set -e

# =============================================================================
# AgentZ Installer (Local Setup)
# =============================================================================
# Sets up AgentZ for local OpenCode usage.
# Agent prompts live in ~/.config/opencode/agent/ (managed separately).
# Run from the repo root: ./install.sh
# =============================================================================

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
OPENCODE_AGENT_DIR="$OPENCODE_CONFIG_DIR/agent"   # OpenCode's real agent dir (singular)
AGENTZ_RUNTIME_DIR="$CURRENT_DIR/.agentz"

echo "🔧 Installing AgentZ (local setup)..."
echo ""
echo "📍 Repo:     $CURRENT_DIR"
echo "📍 OpenCode: $OPENCODE_CONFIG_DIR"
echo ""

# ─── Step 1: Create .agentz runtime directories ───────────────────────────────
echo "📁 Creating .agentz runtime directories..."
mkdir -p "$AGENTZ_RUNTIME_DIR/agents"
mkdir -p "$AGENTZ_RUNTIME_DIR/config"
mkdir -p "$AGENTZ_RUNTIME_DIR/memory"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/active"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/active/subagent-status"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/sessions"
mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/history"
mkdir -p "$AGENTZ_RUNTIME_DIR/skills"
mkdir -p "$AGENTZ_RUNTIME_DIR/tasks"

# ─── Step 2: Verify OpenCode agent files are in place ────────────────────────
echo "🤖 Verifying OpenCode agent files..."
mkdir -p "$OPENCODE_AGENT_DIR"

if [ -f "$OPENCODE_AGENT_DIR/agentz.md" ]; then
    echo "   ✓ agentz (primary) — $OPENCODE_AGENT_DIR/agentz.md"
else
    echo "   ⚠️  agentz.md not found at $OPENCODE_AGENT_DIR/agentz.md"
    echo "      → You need to add the agent prompt file there."
fi

if [ -f "$OPENCODE_AGENT_DIR/agentz-vision.md" ]; then
    echo "   ✓ agentz-vision (subagent) — $OPENCODE_AGENT_DIR/agentz-vision.md"
else
    echo "   ⚠️  agentz-vision.md not found — image delegation will not work"
    echo "      → See: $CURRENT_DIR/README.md for setup instructions"
fi

# ─── Step 3: Seed memory files if not already there ──────────────────────────
echo "🧠 Seeding memory files..."
declare -A MEM_SEEDS=(
    ["conventions.md"]="# Conventions — Project Patterns & Standards\n\n(Auto-populated by agents)\n"
    ["gotchas.md"]="# Gotchas — Known Issues & Fixes\n\n(Auto-populated by agents)\n"
    ["commands.md"]="# Commands — What Worked & What Didn't\n\n(Auto-populated by agents)\n"
    ["learnings.md"]="# Learnings — Cumulative Agent Knowledge\n\n## Entries\n"
)
for memfile in "${!MEM_SEEDS[@]}"; do
    if [ ! -f "$AGENTZ_RUNTIME_DIR/memory/$memfile" ]; then
        printf "${MEM_SEEDS[$memfile]}" > "$AGENTZ_RUNTIME_DIR/memory/$memfile"
        echo "   ✓ Created memory/$memfile"
    else
        echo "   ✓ memory/$memfile already exists"
    fi
done

# ─── Step 4: Seed skill files if not already there ───────────────────────────
echo "🎓 Checking skill files..."
for skill in playwright git-master frontend-ui-ux; do
    if [ -f "$AGENTZ_RUNTIME_DIR/skills/$skill/SKILL.md" ]; then
        echo "   ✓ $skill skill present"
    else
        echo "   ⚠️  $skill skill missing — some agent features may be limited"
    fi
done

# ─── Step 5: Copy config to OpenCode location if available ───────────────────
echo "⚙️  Setting up OpenCode configuration..."
if [ -f "$AGENTZ_RUNTIME_DIR/config/config.json" ]; then
    cp "$AGENTZ_RUNTIME_DIR/config/config.json" "$OPENCODE_CONFIG_DIR/agentz-config.json"
    echo "   ✓ Copied config → $OPENCODE_CONFIG_DIR/agentz-config.json"
else
    echo "   ⚠️  No .agentz/config/config.json found — config defaults will be used"
fi

# ─── Step 6: Install npm dependencies ────────────────────────────────────────
echo "📦 Installing npm dependencies..."
cd "$CURRENT_DIR"
npm install --silent 2>/dev/null || npm install

# ─── Step 7: Build the project ───────────────────────────────────────────────
echo "🔨 Building AgentZ..."
npm run build

# ─── Step 8: Set up agentz CLI alias ─────────────────────────────────────────
echo "🔗 Setting up agentz CLI alias..."

AGENTZ_CLI="$CURRENT_DIR/dist/cli/index.js"

for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ]; then
        if ! grep -q "alias agentz=" "$rc" 2>/dev/null; then
            {
                echo ""
                echo "# AgentZ"
                echo "alias agentz='node $AGENTZ_CLI'"
            } >> "$rc"
            echo "   ✓ Added agentz alias to $rc"
        else
            echo "   ✓ agentz alias already in $rc"
        fi
    fi
done

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "✅ AgentZ installed!"
echo ""
echo "   Repo:          $CURRENT_DIR"
echo "   Primary agent: $OPENCODE_AGENT_DIR/agentz.md"
echo "   Vision agent:  $OPENCODE_AGENT_DIR/agentz-vision.md"
echo "   Config:        $OPENCODE_CONFIG_DIR/agentz-config.json"
echo "   Memory:        $AGENTZ_RUNTIME_DIR/memory/"
echo "   Skills:        $AGENTZ_RUNTIME_DIR/skills/"
echo "   Tasks:         $AGENTZ_RUNTIME_DIR/tasks/"
echo ""
echo "📝 Reload your shell:"
echo "   source ~/.bashrc   # or source ~/.zshrc"
echo ""
echo "🚀 Then run: agentz --help"
echo ""