

## Chatbot Admin Control and Service Integration

### Overview
Add a full admin control panel for the Penny chatbot, allowing admins to configure the bot's behavior, add custom knowledge/context about external services, and manage API keys — all stored in the database and dynamically loaded by the edge function.

### Database Changes (Migration)

**New table: `chatbot_config`**
- `id`, `key` (unique), `value` (text), `updated_at`, `updated_by`
- Keys: `system_prompt`, `welcome_message`, `enabled`, `bot_name`, `response_language`, `max_history_messages`

**New table: `chatbot_knowledge`**
- `id`, `title`, `content` (text — service details, FAQs, product info, URLs), `is_active`, `sort_order`, `created_at`, `updated_at`
- Admins add entries like "Penny Carbs Details", "Return Policy", "Delivery Areas", external site URLs/descriptions
- These get injected into the system prompt dynamically

**New table: `chatbot_api_keys`**
- `id`, `service_name`, `api_key` (encrypted text), `base_url`, `description`, `is_active`, `created_at`
- For storing external service API keys (e.g., delivery tracking API, payment gateway info)
- The edge function reads active keys and can use them for external calls

**RLS**: All three tables restricted to super_admin / users with admin permissions.

### Admin UI — New Chatbot Settings Page

**File: `src/pages/admin/ChatbotSettingsPage.tsx`**

Three tabs:

1. **General Settings** — Toggle chatbot on/off, edit bot name, welcome message, response language (Malayalam/English/Auto), max history messages
2. **Knowledge Base** — CRUD list of knowledge entries (title + content textarea). Each entry's content gets appended to the system prompt. Add/edit/delete with confirmation dialogs.
3. **External Services** — Add external service API keys with name, base URL, description. Show masked keys. Edit/delete with confirmation.

Add route `/admin/chatbot` and sidebar link in AdminLayout.

### Edge Function Update — `supabase/functions/chat/index.ts`

- On each request, fetch `chatbot_config` and active `chatbot_knowledge` entries from the database
- Build the system prompt dynamically: base prompt from `system_prompt` config + all knowledge entries appended as context sections
- Fetch active `chatbot_api_keys` — if external service calls are needed, the function has the keys available
- Respect `enabled` flag — return a friendly message if chatbot is disabled
- Cache config briefly (or fetch fresh each request since it's lightweight)

### Frontend ChatBot Update — `src/components/ChatBot.tsx`

- Fetch `chatbot_config` (enabled, bot_name, welcome_message) from `app_settings` or the new config table on mount
- If disabled, hide the chat bubble entirely
- Use dynamic bot name and welcome message from config

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | Create `chatbot_config`, `chatbot_knowledge`, `chatbot_api_keys` tables with RLS |
| `src/pages/admin/ChatbotSettingsPage.tsx` | New admin page with 3 tabs |
| `src/components/admin/AdminLayout.tsx` | Add sidebar link for Chatbot Settings |
| `src/App.tsx` | Add route `/admin/chatbot` |
| `supabase/functions/chat/index.ts` | Dynamic prompt from DB, external service keys |
| `src/components/ChatBot.tsx` | Load config (enabled, name, welcome message) |

