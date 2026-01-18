-- Script to update UserType for all users in PE_User table
-- Sets all users to 'Editor' except karim.fayazi@sjdap.org which is set to 'Super Admin'

-- First, set karim.fayazi@sjdap.org to 'Super Admin'
UPDATE [SJDA_Users].[dbo].[PE_User]
SET [UserType] = 'Super Admin',
    [user_update_date] = GETDATE()
WHERE [email_address] = 'karim.fayazi@sjdap.org';

-- Then, set all other users to 'Editor'
UPDATE [SJDA_Users].[dbo].[PE_User]
SET [UserType] = 'Editor',
    [user_update_date] = GETDATE()
WHERE [email_address] IS NULL 
   OR ([email_address] IS NOT NULL AND [email_address] != 'karim.fayazi@sjdap.org');

-- Verify the updates
SELECT [UserId], [email_address], [UserType]
FROM [SJDA_Users].[dbo].[PE_User]
ORDER BY [UserType], [email_address];
