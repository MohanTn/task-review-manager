#!/usr/bin/env bash
# install-prompts.sh
# Copies workflow prompt files (refine-feature + dev-workflow) into a destination repo
# for use with Claude Code (.claude/commands/) or GitHub Copilot (.github/prompts/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Helpers ────────────────────────────────────────────────────────────────

print_header() {
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║        Workflow Prompt Installer                 ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
}

print_success() { echo "  ✔  $1"; }
print_error()   { echo "  ✘  $1" >&2; }
print_info()    { echo "  ℹ  $1"; }

# ─── Ask AI assistant ────────────────────────────────────────────────────────

ask_assistant() {
  echo "Which AI assistant will you use in the destination repo?"
  echo ""
  echo "  1) Claude Code  → copies into  .claude/commands/"
  echo "  2) GitHub Copilot → copies into  .github/prompts/"
  echo ""
  while true; do
    read -rp "  Enter choice [1 or 2]: " choice
    case "$choice" in
      1) ASSISTANT="claude";  break ;;
      2) ASSISTANT="copilot"; break ;;
      *) echo "  Please enter 1 or 2." ;;
    esac
  done
}

# ─── Ask destination path ────────────────────────────────────────────────────

ask_destination() {
  echo ""
  while true; do
    read -rp "  Enter the absolute or relative path to the destination repo: " dest
    # Expand ~ and resolve relative paths
    dest="${dest/#\~/$HOME}"
    dest="$(realpath -m "$dest" 2>/dev/null || echo "$dest")"

    if [[ -z "$dest" ]]; then
      print_error "Path cannot be empty."
    elif [[ ! -d "$dest" ]]; then
      print_error "Directory not found: $dest"
      read -rp "  Create it? [y/N]: " create
      if [[ "$create" =~ ^[Yy]$ ]]; then
        mkdir -p "$dest"
        print_success "Created: $dest"
        DEST_REPO="$dest"
        break
      fi
    else
      DEST_REPO="$dest"
      break
    fi
  done
}

# ─── Copy files ──────────────────────────────────────────────────────────────

copy_files() {
  local src dst files=()

  if [[ "$ASSISTANT" == "claude" ]]; then
    src="$SOURCE_ROOT/.claude/commands"
    dst="$DEST_REPO/.claude/commands"
  else
    src="$SOURCE_ROOT/.github/prompts"
    dst="$DEST_REPO/.github/prompts"
  fi

  if [[ ! -d "$src" ]]; then
    print_error "Source directory not found: $src"
    exit 1
  fi

  echo ""
  print_info "Source : $src"
  print_info "Destination : $dst"
  echo ""

  mkdir -p "$dst"

  while IFS= read -r -d '' file; do
    files+=("$file")
  done < <(find "$src" -maxdepth 1 -type f \( -name "*.md" \) -print0)

  if [[ ${#files[@]} -eq 0 ]]; then
    print_error "No prompt files found in $src"
    exit 1
  fi

  for file in "${files[@]}"; do
    filename="$(basename "$file")"
    cp "$file" "$dst/$filename"
    print_success "Copied: $filename  →  $dst/"
  done
}

# ─── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo "────────────────────────────────────────────────────"
  if [[ "$ASSISTANT" == "claude" ]]; then
    echo "  Done! To use these prompts in Claude Code, run:"
    echo ""
    echo "    /refine-feature   (inside .claude/commands/refine-feature.md)"
    echo "    /dev-workflow     (inside .claude/commands/dev-workflow.md)"
  else
    echo "  Done! To use these prompts in GitHub Copilot Chat, reference:"
    echo ""
    echo "    #file:.github/prompts/refine-feature.prompt.md"
    echo "    #file:.github/prompts/dev-workflow.prompt.md"
    echo ""
    echo "  Or attach them via the Copilot Chat prompt file picker."
  fi
  echo "────────────────────────────────────────────────────"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  print_header
  ask_assistant
  ask_destination
  copy_files
  print_summary
}

main "$@"
