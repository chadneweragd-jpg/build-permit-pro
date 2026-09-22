-- Migration 005: Complete Audit & Removal of Placeholder / Mock Data Across Build Permit Pro
-- Clears hardcoded mock, dummy, or fallback contact information (specifically dummy phone numbers like (250) 860-0100 and emails like estimating@contractor.bc.ca)

-- 1. Sanitize permits table
UPDATE permits
SET contractor_phone = NULL
WHERE contractor_phone ILIKE '%860-0100%'
   OR contractor_phone ILIKE '%8600100%'
   OR contractor_phone ILIKE '%555-%'
   OR contractor_phone ILIKE '%5550100%'
   OR contractor_phone ILIKE '%860-3100%'
   OR contractor_phone ILIKE '%8603100%'
   OR contractor_phone ILIKE '%860-1234%';

UPDATE permits
SET contractor_email = NULL
WHERE contractor_email ILIKE '%contractor.bc.ca%'
   OR contractor_email ILIKE '%builder.bc.ca%'
   OR contractor_email ILIKE '%contractor.ca%'
   OR contractor_email ILIKE '%example.com%'
   OR contractor_email ILIKE '%test.com%';

-- 2. Sanitize any CRM deals created from dummy permit data
UPDATE crm_deals
SET contact_phone = NULL
WHERE contact_phone ILIKE '%860-0100%'
   OR contact_phone ILIKE '%8600100%'
   OR contact_phone ILIKE '%555-%'
   OR contact_phone ILIKE '%5550100%'
   OR contact_phone ILIKE '%860-3100%'
   OR contact_phone ILIKE '%8603100%'
   OR contact_phone ILIKE '%860-1234%';

UPDATE crm_deals
SET contact_email = NULL
WHERE contact_email ILIKE '%contractor.bc.ca%'
   OR contact_email ILIKE '%builder.bc.ca%'
   OR contact_email ILIKE '%contractor.ca%'
   OR contact_email ILIKE '%example.com%'
   OR contact_email ILIKE '%test.com%';
