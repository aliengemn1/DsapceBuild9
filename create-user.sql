-- Create a new DSpace user with hashed password
-- Note: DSpace uses BCrypt for password hashing

-- First, check what users exist
SELECT email, firstname, lastname FROM eperson;

-- Generate a UUID for the new user
DO $$
DECLARE
    new_user_uuid UUID := gen_random_uuid();
    admin_group_uuid UUID;
BEGIN
    -- Insert the new user
    INSERT INTO eperson (uuid, email, password, can_log_in, require_certificate, self_registered, last_active, netid, salt, firstname, lastname, phone, language)
    VALUES (
        new_user_uuid,
        'catalog1@example.com',
        -- BCrypt hash for '123456' - pre-computed
        '$2a$10$dSXQqRhWYRVHN.9WwVxg3O1XGZ0Tnj3CKZmDwxXCp8ZkjgQ3JnF2a',
        true,
        false,
        false,
        NOW(),
        NULL,
        NULL,
        'Catalog',
        'Admin',
        NULL,
        'en'
    );

    -- Get Administrator group UUID
    SELECT uuid INTO admin_group_uuid FROM epersongroup WHERE name = 'Administrator';

    -- Add user to Administrator group
    IF admin_group_uuid IS NOT NULL THEN
        INSERT INTO epersongroup2eperson (eperson_group_id, eperson_id)
        VALUES (admin_group_uuid, new_user_uuid);
        RAISE NOTICE 'User added to Administrator group';
    END IF;

    RAISE NOTICE 'Created user with UUID: %', new_user_uuid;
END $$;

-- Verify the user was created
SELECT email, firstname, lastname FROM eperson WHERE email = 'catalog1@example.com';
