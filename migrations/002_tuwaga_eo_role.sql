-- EO is an application role, never a global Auth administrator role.
-- Keep every existing user assignment and default role unchanged.
INSERT INTO oauth_client_role (id, "clientId", role, "isDefault")
SELECT 'tuwaga-eo-' || "clientId", "clientId", 'eo', FALSE
FROM "oauthApplication"
WHERE "clientId" = 'MdDAHWXdFhwCySkMOapFeIbEvgjklnVL'
ON CONFLICT ("clientId", role) DO NOTHING;
