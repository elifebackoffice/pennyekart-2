
INSERT INTO public.permissions (feature, action, name, description) VALUES
  ('chatbot', 'read', 'read_chatbot', 'View chatbot settings, knowledge base, and audit logs'),
  ('chatbot', 'update', 'update_chatbot', 'Update chatbot configuration, API keys, and knowledge'),
  ('notifications', 'read', 'read_notifications', 'View notifications and analytics'),
  ('notifications', 'create', 'create_notifications', 'Create and send notifications'),
  ('notifications', 'update', 'update_notifications', 'Edit existing notifications'),
  ('notifications', 'delete', 'delete_notifications', 'Delete notifications'),
  ('scratch_rewards', 'read', 'read_scratch_rewards', 'View scratch reward cards and claims'),
  ('scratch_rewards', 'create', 'create_scratch_rewards', 'Create scratch reward cards'),
  ('scratch_rewards', 'update', 'update_scratch_rewards', 'Edit scratch reward cards'),
  ('scratch_rewards', 'delete', 'delete_scratch_rewards', 'Delete scratch reward cards'),
  ('flash_sales', 'read', 'read_flash_sales', 'View flash sales'),
  ('flash_sales', 'create', 'create_flash_sales', 'Create flash sales'),
  ('flash_sales', 'update', 'update_flash_sales', 'Edit flash sales'),
  ('flash_sales', 'delete', 'delete_flash_sales', 'Delete flash sales')
ON CONFLICT (name) DO NOTHING;
