#!/bin/bash
set -e

# =============================================================================
# AgentZ Updater (Local Setup)
# =============================================================================
# Rebuilds AgentZ from source and re-syncs all config/agent files.
# Run from the repo root: ./update.sh
#
# Subcommands:
#   ./update.sh          — full update (deps + build + sync) [skips if clean]
#   ./update.sh sync     — sync configs only, no build
#   ./update.sh diff     — show what would change in agentz-config.json, no write
#   ./update.sh force    — force full rebuild even if up-to-date
# =============================================================================

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
OPENCODE_AGENT_DIR="$OPENCODE_CONFIG_DIR/agent"
AGENTZ_RUNTIME_DIR="$CURRENT_DIR/.agentz"
SOURCE_CONFIG="$AGENTZ_RUNTIME_DIR/config/config.json"
DEST_CONFIG="$OPENCODE_CONFIG_DIR/agentz-config.json"

# Build memory limit — prevent OOM on constrained systems
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# =============================================================================
# Helper: check if build is needed
# =============================================================================
needs_build() {
    # Need build if dist/ doesn't exist
    if [ ! -f "$CURRENT_DIR/dist/cli/index.js" ]; then
        return 0
    fi

    # Need build if any source file is newer than dist
    if [ -f "$CURRENT_DIR/.agentz/.build_marker" ]; then
        local src_mtime=$(find "$CURRENT_DIR/src" -type f -name "*.ts" -newer "$CURRENT_DIR/.agentz/.build_marker" 2>/dev/null | wc -l)
        if [ "$src_mtime" -gt 0 ]; then
            return 0
        fi
    else
        # No marker means assume stale
        return 0
    fi

    # Need build if package.json or package-lock.json changed
    if [ -f "$CURRENT_DIR/package-lock.json" ]; then
        if [ "$CURRENT_DIR/package-lock.json" -nt "$CURRENT_DIR/dist/cli/index.js" ]; then
            return 0
        fi
    fi

    return 1
}

# =============================================================================
# Helper: touch build marker after successful build
# =============================================================================
mark_built() {
    mkdir -p "$CURRENT_DIR/.agentz"
    touch "$CURRENT_DIR/.agentz/.build_marker"
}

# ─── Shared Python comparator — call as: _config_diff src dst ────────────────
_config_diff() {
    local src="$1" dst="$2"
    python3 - "$src" "$dst" <<'PYEOF'
import json, sys

with open(sys.argv[1]) as f: src = json.load(f)
with open(sys.argv[2]) as f: dst = json.load(f)

changes = []

src_agents = src.get('agents', {})
dst_agents = dst.get('agents', {})
all_keys = sorted(set(src_agents) | set(dst_agents))

for agent in all_keys:
    if agent not in dst_agents:
        changes.append(f"  + [{agent}] NEW agent (not in destination)")
        continue
    if agent not in src_agents:
        changes.append(f"  - [{agent}] removed (not in source)")
        continue

    sc = [f"{e['provider']}/{e['model']}" for e in src_agents[agent].get('modelChain', [])]
    dc = [f"{e['provider']}/{e['model']}" for e in dst_agents[agent].get('modelChain', [])]
    st = src_agents[agent].get('timeoutSeconds')
    dt = dst_agents[agent].get('timeoutSeconds')

    if sc != dc or st != dt:
        changes.append(f"  ~ [{agent}]")
        for i, (old, new) in enumerate(zip(dc, sc)):
            if old != new:
                changes.append(f"      #{i+1}: {old}")
                changes.append(f"          → {new}")
        for entry in sc[len(dc):]:
            changes.append(f"      + {entry}  (added)")
        for entry in dc[len(sc):]:
            changes.append(f"      - {entry}  (removed)")
        if st != dt:
            changes.append(f"      timeout: {dt}s → {st}s")

sp = src.get('primary', {}).get('model', '')
dp = dst.get('primary', {}).get('model', '')
if sp != dp:
    changes.append(f"  ~ [primary] {dp} → {sp}")

print('\n'.join(changes) if changes else 'NO_CHANGES')
PYEOF
}

# =============================================================================
# sync_config — compare + overwrite agentz-config.json from repo source
# =============================================================================
sync_config() {
    echo -e "${CYAN}⚙️  Syncing agentz-config.json...${RESET}"

    if [ ! -f "$SOURCE_CONFIG" ]; then
        echo -e "   ${RED}❌ Source not found: $SOURCE_CONFIG${RESET}"
        echo "      Create .agentz/config/config.json first."
        return 1
    fi

    mkdir -p "$OPENCODE_CONFIG_DIR"

    if [ -f "$DEST_CONFIG" ]; then
        local diff_out
        diff_out=$(_config_diff "$SOURCE_CONFIG" "$DEST_CONFIG")

        if [ "$diff_out" = "NO_CHANGES" ]; then
            echo -e "   ${GREEN}✓ Already in sync — nothing to do${RESET}"
            return 0
        fi

        echo -e "   ${YELLOW}📋 Changes to be applied:${RESET}"
        echo "$diff_out"
        echo ""
    else
        echo -e "   ${YELLOW}ℹ️  No existing agentz-config.json — creating fresh${RESET}"
    fi

    cp "$SOURCE_CONFIG" "$DEST_CONFIG"
    echo -e "   ${GREEN}✓ Synced → $DEST_CONFIG${RESET}"
}

# =============================================================================
# diff_only — show what would change, no write
# =============================================================================
diff_only() {
    echo -e "${BOLD}AgentZ Config Diff${RESET}"
    echo -e "  Source: ${BOLD}$SOURCE_CONFIG${RESET}"
    echo -e "  Target: ${BOLD}$DEST_CONFIG${RESET}"
    echo ""

    if [ ! -f "$SOURCE_CONFIG" ]; then
        echo -e "${RED}❌ Source config not found${RESET}"
        exit 1
    fi

    if [ ! -f "$DEST_CONFIG" ]; then
        echo -e "${YELLOW}ℹ️  No destination config — full file would be written${RESET}"
        exit 0
    fi

    local diff_out
    diff_out=$(_config_diff "$SOURCE_CONFIG" "$DEST_CONFIG")

    if [ "$diff_out" = "NO_CHANGES" ]; then
        echo -e "${GREEN}✓ Configs are identical — no changes needed${RESET}"
    else
        echo -e "${YELLOW}Changes that would be applied:${RESET}"
        echo "$diff_out"
        echo ""
        echo -e "Run ${BOLD}./update.sh sync${RESET} to apply."
    fi
}

# =============================================================================
# sync_only — sync configs + check agent files, no build
# =============================================================================
sync_only() {
    echo -e "${BOLD}🔄 AgentZ Config Sync${RESET}"
    echo ""

    sync_config

    echo ""
    echo -e "${CYAN}🤖 Syncing agent spec files to OpenCode...${RESET}"
    local agents=("agentz" "agentz-vision" "z-coder" "z-planner" "z-tester" "z-reviewer" "z-security" "z-docs" "z-refactor" "z-debugger" "z-researcher")
    local all_ok=true

    mkdir -p "$OPENCODE_AGENT_DIR"

    for agent in "${agents[@]}"; do
        local spec="$AGENTZ_RUNTIME_DIR/agents/${agent}.md"
        if [ -f "$spec" ]; then
            cp "$spec" "$OPENCODE_AGENT_DIR/${agent}.md"
            echo -e "   ${GREEN}✓${RESET} Synced ${agent}.md"
        else
            echo -e "   ${RED}❌${RESET} ${agent}.md — missing from .agentz/agents/"
            all_ok=false
        fi
    done

    echo ""
    if [ "$all_ok" = true ]; then
        echo -e "${GREEN}✅ Sync complete${RESET}"
    else
        echo -e "${YELLOW}⚠️  Sync complete with warnings${RESET}"
    fi
    echo ""
    echo -e "   Config: ${BOLD}$DEST_CONFIG${RESET}"
    echo -e "   Agents: ${BOLD}$OPENCODE_AGENT_DIR/${RESET}"
    echo ""
    echo -e "🚀 Restart OpenCode to pick up any changes."
    echo ""
}

# =============================================================================
# full_update — deps + build + sync (default)
# =============================================================================
full_update() {
    echo -e "${BOLD}🔄 Updating AgentZ...${RESET}"
    echo ""

    # Step 1: Directories
    echo -e "${CYAN}📁 Ensuring directories...${RESET}"
    mkdir -p "$OPENCODE_AGENT_DIR"
    mkdir -p "$AGENTZ_RUNTIME_DIR/memory"
    mkdir -p "$AGENTZ_RUNTIME_DIR/skills"
    mkdir -p "$AGENTZ_RUNTIME_DIR/tasks"
    mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/active/subagent-status"
    mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/sessions"
    mkdir -p "$AGENTZ_RUNTIME_DIR/runtime/history"
    echo -e "   ${GREEN}✓${RESET} Directories ready"

    # Step 2: OpenCode agent presence check
    echo ""
    echo -e "${CYAN}🤖 Checking OpenCode agent files...${RESET}"
    for af in "agentz.md" "agentz-vision.md"; do
        if [ -f "$OPENCODE_AGENT_DIR/$af" ]; then
            echo -e "   ${GREEN}✓${RESET} $af"
        else
            echo -e "   ${YELLOW}⚠️${RESET}  $af missing from $OPENCODE_AGENT_DIR"
        fi
    done

    # Step 3: Sync config (with diff preview)
    echo ""
    sync_config

    # Step 4: npm install + build (conditional on FORCE_MODE or needs_build)
    echo ""
    echo -e "${CYAN}▸ Checking dependencies...${RESET}"

    if [ "$FORCE_MODE" = true ]; then
        echo -e "  ${YELLOW}Force mode: full reinstall${RESET}"
        npm install --silent --no-fund --no-audit 2>&1 | tail -3
        echo -e "   ${GREEN}✓${RESET} Dependencies installed"
        mark_built

        echo ""
        echo -e "${CYAN}🔨 Rebuilding TypeScript...${RESET}"
        npm run build
        mark_built
        echo -e "   ${GREEN}✓${RESET} Build complete"
    elif needs_build; then
        echo -e "  ${YELLOW}Source files changed — installing dependencies...${RESET}"
        npm install --silent --no-fund --no-audit 2>&1 | tail -3
        echo ""
        echo -e "${CYAN}🔨 Rebuilding TypeScript...${RESET}"
        npm run build
        mark_built
        echo -e "   ${GREEN}✓${RESET} Build complete"
    else
        echo -e "  ${GREEN}Dependencies and build up-to-date (skipping install + tsc)${RESET}"
    fi

    # Step 5: CLI alias
    echo ""
    echo -e "${CYAN}🔗 Verifying agentz CLI alias...${RESET}"
    local agentz_cli="$CURRENT_DIR/dist/cli/index.js"
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
        if [ -f "$rc" ]; then
            if grep -q "alias agentz=" "$rc" 2>/dev/null; then
                echo -e "   ${GREEN}✓${RESET} alias present in $(basename $rc)"
            else
                { echo ""; echo "# AgentZ"; echo "alias agentz='node $agentz_cli'"; } >> "$rc"
                echo -e "   ${GREEN}✓${RESET} Added alias to $(basename $rc)"
            fi
        fi
    done

    # Step 6: Sanity check
    echo ""
    echo -e "${CYAN}🔍 Sanity check...${RESET}"
    if [ -f "$CURRENT_DIR/dist/cli/index.js" ]; then
        echo -e "   ${GREEN}✓${RESET} dist/cli/index.js built"
    else
        echo -e "   ${RED}❌ Build output missing${RESET}"
        exit 1
    fi

    if command -v opencode &>/dev/null; then
        local agent_list
        agent_list=$(opencode agent list 2>/dev/null || echo "")
        if echo "$agent_list" | grep -q "agentz"; then
            echo -e "   ${GREEN}✓${RESET} agentz visible in opencode agent list"
        else
            echo -e "   ${YELLOW}⚠️${RESET}  agentz not detected — restart OpenCode"
        fi
        if echo "$agent_list" | grep -q "agentz-vision"; then
            echo -e "   ${GREEN}✓${RESET} agentz-vision visible"
        fi
    fi

    echo ""
    echo -e "${GREEN}${BOLD}✅ AgentZ updated!${RESET}"
    echo ""
    echo -e "   Repo:    ${BOLD}$CURRENT_DIR${RESET}"
    echo -e "   Config:  ${BOLD}$DEST_CONFIG${RESET}"
    echo -e "   Agents:  ${BOLD}$OPENCODE_AGENT_DIR/${RESET}"
    echo ""
    echo -e "🚀 Restart OpenCode if agent prompts were edited."
}

# =============================================================================
# Entry point
# =============================================================================
FORCE_MODE=false

case "${1:-}" in
    sync)  sync_only ;;
    diff)  diff_only ;;
    force) FORCE_MODE=true; full_update ;;
    "")    full_update ;;
    *)
        echo "Usage: ./update.sh [sync|diff|force]"
        echo ""
        echo "  (no args)  — full update: deps + build + config sync"
        echo "  sync       — sync agentz-config.json and verify agent files, no build"
        echo "  diff       — show what would change in agentz-config.json, no write"
        echo "  force      — force full rebuild even if up-to-date"
        exit 1
        ;;
esac
