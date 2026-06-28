# Store Submission Checklist

This plugin is ready to be packaged for the Codex directory once the public MCP endpoint and dashboard review flow are available.

## Positioning
- Problem: agents lose continuity, burn quota, and repeat work across long sessions.
- Promise: keep task continuity while reducing active context pressure and prompt spend.
- Proof: Phase 32 benchmarks and workspace replay evidence document the savings.

## Public Listing Copy
- Name: `Cross-Session Memory Bridge`
- Short description: `Reuse cross-session memory from Codex.`
- Long description: `Postgres-backed memory, compaction, checkpointing, and context briefs that keep long coding sessions coherent while reducing token spend.`
- Category: `Productivity`
- Capabilities: `Search`, `Write`, `Long-term memory`

## Required Submission Assets
- App name
- Logo
- Description
- Company URL
- Privacy policy URL
- MCP server URL
- Tool inventory
- Screenshots
- Test prompts
- Test responses
- Localization details

## Review Readiness
- The MCP server must be reachable without extra internal network steps.
- The reviewer account should be able to authenticate with no MFA surprises.
- The same public endpoint should remain stable across app versions.
- Test prompts should show search, brief building, compaction, and handoff behavior.

## Suggested Review Prompts
- Find the last design decision from the current workspace and summarize it.
- Build a context brief for this task from prior sessions.
- Save a lesson when a repeated mistake appears.
- Show the current context pressure and whether compaction is needed.

## Suggested Review Responses
- The plugin recalls prior work instead of restarting from zero.
- The plugin exposes a compact context brief and checkpoint recovery path.
- The plugin shows visible pressure state so the session can compact before overflow.

## Launch Path
1. Keep the repo-local plugin for local testing.
2. Host the MCP server on a public URL.
3. Fill out the OpenAI dashboard submission form.
4. Submit for review.
5. Publish after approval.

## Docs To Keep In Sync
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/SYSTEM_MAP.md`
- `docs/DECISIONS.md`
- `docs/RUNBOOK.md`
