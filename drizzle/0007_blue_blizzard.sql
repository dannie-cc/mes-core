INSERT INTO user_settings (user_id, consent, created_at, updated_at)
SELECT u.id, FALSE, NOW(), NOW()
FROM users u
WHERE NOT EXISTS (
SELECT 1
FROM user_settings us
WHERE us.user_id = u.id
);
