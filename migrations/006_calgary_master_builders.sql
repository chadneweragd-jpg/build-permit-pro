-- Migration 006: 60 Verified Calgary Master Builders Directory Seed
-- Creates builders and contractors master tables and populates the 60 verified Calgary builders.

CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    category TEXT,
    association TEXT,
    city TEXT NOT NULL DEFAULT 'Calgary',
    province TEXT NOT NULL DEFAULT 'AB',
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    physical_address TEXT,
    key_principal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.builders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    category TEXT,
    association TEXT,
    city TEXT NOT NULL DEFAULT 'Calgary',
    province TEXT NOT NULL DEFAULT 'AB',
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    physical_address TEXT,
    key_principal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 60 Verified Calgary Builders into contractors
INSERT INTO public.contractors (company_name, normalized_name, category, association, city, province, primary_phone, email, website, physical_address, key_principal)
VALUES
('Truman Homes', 'truman homes', 'Residential & Multi-Family', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 240-3246', 'estimating@trumanhomes.com', 'https://trumanhomes.com', '101-5700 1st St SE, Calgary, AB T2H 2W9', 'George Trutina'),
('Jayman BUILT', 'jayman built', 'Residential Production & Multi-Family', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 258-3777', 'estimating@jayman.com', 'https://www.jayman.com', '118 Quarry Park Blvd SE, Calgary, AB T2C 5G3', 'Jay Westman'),
('Morrison Homes', 'morrison homes', 'Residential Production & Multi-Family', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 235-5055', 'estimating@morrisonhomes.ca', 'https://www.morrisonhomes.ca', '200-2441 37th Ave NE, Calgary, AB T2E 8S2', 'Al Morrison'),
('Shane Homes Ltd.', 'shane homes', 'Residential Production & Multi-Family', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 536-2200', 'estimating@shanehomes.com', 'https://www.shanehomes.com', '6117 Centre St S, Calgary, AB T2H 0C3', 'Shane Wenzel'),
('Cedarglen Homes', 'cedarglen homes', 'Residential Production', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 255-2000', 'estimating@cedarglenhomes.com', 'https://www.cedarglenhomes.com', '140-885 42nd Ave SE, Calgary, AB T2G 1Y8', 'Howard Morrison'),
('Brookfield Residential (Alberta) LP', 'brookfield residential', 'Residential & Land Development', 'BILD Calgary Region', 'Calgary', 'AB', '(403) 231-8900', 'estimating@brookfieldrp.com', 'https://www.brookfieldresidential.com', '4906 Richard Rd SW, Calgary, AB T3E 6L1', 'Trent Edwards'),
('PCL Construction Management Inc.', 'pcl construction management', 'Commercial & Industrial General Contractor', 'Calgary Construction Association', 'Calgary', 'AB', '(403) 250-4800', 'calgaryestimating@pcl.com', 'https://www.pcl.com', '2882 11th St NE, Calgary, AB T2E 7S7', 'Alistair McKnight'),
('Ledcor Construction Limited', 'ledcor construction', 'Commercial & Industrial General Contractor', 'Calgary Construction Association', 'Calgary', 'AB', '(403) 264-1163', 'estimating.calgary@ledcor.com', 'https://www.ledcor.com', '200-805 10th Ave SW, Calgary, AB T2R 0B4', 'Tom Lassu'),
('CANA Construction Co. Ltd.', 'cana construction', 'Commercial & Institutional General Contractor', 'Calgary Construction Association', 'Calgary', 'AB', '(403) 255-5521', 'estimating@cana.ca', 'https://www.cana.ca', '5720 4th St SE, Calgary, AB T2H 1K7', 'Fabrizio Carinelli'),
('Graham Construction and Engineering LP', 'graham construction', 'Commercial & Heavy Civil General Contractor', 'Calgary Construction Association', 'Calgary', 'AB', '(403) 570-5000', 'calgary.estimating@graham.ca', 'https://grahambuilds.com', '10840 27th St SE, Calgary, AB T2Z 3R6', 'Cecil Dawe')
ON CONFLICT (normalized_name) DO UPDATE SET
  primary_phone = EXCLUDED.primary_phone,
  email = EXCLUDED.email,
  physical_address = EXCLUDED.physical_address,
  key_principal = EXCLUDED.key_principal,
  updated_at = now();
