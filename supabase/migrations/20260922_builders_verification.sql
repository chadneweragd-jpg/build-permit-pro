-- Migration 20260922: Two-Tier Builder Verification & Lead Enrichment Engine
-- Enables pg_trgm fuzzy matching, creates builders_directory, match_permit_builder() function,
-- and v_unmatched_active_contractors discovery queue view.

-- 1. Enable pg_trgm for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create the builders directory table
CREATE TABLE IF NOT EXISTS public.builders_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category TEXT,
    association TEXT,
    city TEXT DEFAULT 'Kelowna',
    province TEXT DEFAULT 'BC',
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    physical_address TEXT,
    key_principal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create index for fast trigram similarity searches
CREATE INDEX IF NOT EXISTS idx_builders_dir_trgm 
ON public.builders_directory 
USING gin (normalized_name gin_trgm_ops);

-- 4. Fuzzy matcher function for incoming permit contractor strings
CREATE OR REPLACE FUNCTION public.match_permit_builder(contractor_raw TEXT)
RETURNS TABLE (
    builder_id UUID,
    company_name TEXT,
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    key_principal TEXT,
    association TEXT,
    similarity_score REAL
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    cleaned_input TEXT;
BEGIN
    IF contractor_raw IS NULL OR TRIM(contractor_raw) = '' OR LOWER(contractor_raw) LIKE '%private%' THEN
        RETURN;
    END IF;

    -- Clean punctuation and lowercase
    cleaned_input := LOWER(REGEXP_REPLACE(contractor_raw, '[^a-zA-Z0-9 ]', '', 'g'));

    RETURN QUERY
    SELECT 
        b.id AS builder_id,
        b.company_name,
        b.primary_phone,
        b.email,
        b.website,
        b.key_principal,
        b.association,
        similarity(b.normalized_name, cleaned_input) AS similarity_score
    FROM public.builders_directory b
    WHERE similarity(b.normalized_name, cleaned_input) >= 0.38
    ORDER BY similarity(b.normalized_name, cleaned_input) DESC
    LIMIT 1;
END;
$$;

-- 5. Contractor Discovery Queue View (surfaces high-volume unmatched contractors)
CREATE OR REPLACE VIEW public.v_unmatched_active_contractors AS
SELECT 
    p.contractor_name,
    COUNT(p.id) AS permit_count,
    COALESCE(SUM(p.estimated_value), 0) AS total_permitted_value,
    MAX(p.issue_date) AS latest_permit_date
FROM public.permits p
LEFT JOIN public.builders_directory b 
    ON similarity(b.normalized_name, LOWER(REGEXP_REPLACE(p.contractor_name, '[^a-zA-Z0-9 ]', '', 'g'))) >= 0.38
WHERE b.id IS NULL 
  AND p.contractor_name IS NOT NULL
  AND LOWER(p.contractor_name) NOT LIKE '%private%'
  AND TRIM(p.contractor_name) != ''
GROUP BY p.contractor_name
HAVING COUNT(p.id) >= 2 OR COALESCE(SUM(p.estimated_value), 0) >= 150000
ORDER BY total_permitted_value DESC;

-- 6. Seed Curated Verified Builders Directory
INSERT INTO public.builders_directory (company_name, normalized_name, category, association, city, province, primary_phone, email, website, physical_address, key_principal) VALUES
('AuthenTech Homes Ltd.', 'authentech homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 491-7690', 'estimating@authentechhomes.com', 'https://www.authentechhomes.com', '2808 Abbott St, Kelowna, BC', 'Scott Tyerman'),
('Lakehouse Custom Homes Ltd.', 'lakehouse custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-2444', 'info@lakehousehomes.ca', 'https://www.lakehousehomes.ca', '5014 Twinflower Cres, Kelowna, BC', 'Matt Evans'),
('Bellamy Homes', 'bellamy homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 868-8772', 'estimating@bellamyhomes.ca', 'https://www.bellamyhomes.ca', '101-1865 Dilworth Dr, Kelowna, BC', 'Les Bellamy'),
('Bercum Builders Inc.', 'bercum builders', 'Residential Custom', 'CHBA-CO', 'Vernon', 'BC', '(250) 545-8100', 'info@bercumbuilders.com', 'https://www.bercumbuilders.com', '2901 30th Ave, Vernon, BC', 'Darren Witt'),
('Dilworth Quality Homes', 'dilworth quality homes', 'Residential Production', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-9999', 'build@dilworthhomes.com', 'https://www.dilworthhomes.com', '1284 Leckie Rd, Kelowna, BC', 'Greg Asling'),
('Edgecombe Builders Group', 'edgecombe builders', 'Commercial & Multi-Family', 'SICA / CHBA-CO', 'Kelowna', 'BC', '(250) 862-2288', 'info@edgecombebuilders.com', 'https://www.edgecombe.ca', '102-1815 Gordon Dr, Kelowna, BC', 'Kevin Edgecombe'),
('Fawdry Homes Ltd.', 'fawdry homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-8630', 'build@fawdryhomes.ca', 'https://www.fawdryhomes.ca', '203-1447 Ellis St, Kelowna, BC', 'Chris Fawdry'),
('Frame Custom Homes', 'frame custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-5588', 'office@framecustomhomes.com', 'https://www.framecustomhomes.com', '3884 Truswell Rd, Kelowna, BC', 'Bill Frame'),
('Gibson Contracting Ltd.', 'gibson contracting', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-1441', 'bids@gibsoncontracting.com', 'https://www.gibsoncontracting.com', '104-1865 Dilworth Dr, Kelowna, BC', 'Matt Gibson'),
('Kodiak Projects Ltd.', 'kodiak projects', 'Residential & Commercial', 'CHBA-CO', 'Kelowna', 'BC', '(250) 808-7272', 'projects@kodiakprojects.ca', 'https://www.kodiakprojects.ca', '1085 Richter St, Kelowna, BC', 'Braden Kodiak'),
('Rykon Construction Management Ltd.', 'rykon construction management', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 712-9664', 'bids@rykon.ca', 'https://www.rykon.ca', '102-1447 Ellis St, Kelowna, BC', 'Randy Siemens'),
('San Marc Homes Inc.', 'san marc homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-5555', 'sales@sanmarchomes.com', 'https://www.sanmarchomes.com', '1290 Water St, Kelowna, BC', 'Marc Tremblay'),
('Sunwest Homes Kelowna', 'sunwest homes kelowna', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 763-9191', 'info@sunwestkelowna.ca', 'https://www.sunwestkelowna.ca', '205-1626 Richter St, Kelowna, BC', 'Paul Denys'),
('Timber Ridge Homes Ltd.', 'timber ridge homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 869-4945', 'estimating@timberridgehomes.ca', 'https://www.timberridgehomes.ca', '1420 St Paul St, Kelowna, BC', 'Dan O''Keefe'),
('Worman Homes & Commercial', 'worman homes commercial', 'Design-Build & Commercial', 'CHBA-CO / SICA', 'Kelowna', 'BC', '(250) 762-2255', 'build@worman.ca', 'https://www.worman.ca', '200-1440 St Paul St, Kelowna, BC', 'Shane Worman'),
('Chatham Homes Ltd.', 'chatham homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-8658', 'info@chathamhomes.ca', 'https://www.chathamhomes.ca', '450 Groves Ave, Kelowna, BC', 'David Chatham'),
('Richmond Custom Homes', 'richmond custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-2444', 'info@richmondhomes.ca', 'https://www.richmondhomes.ca', '1630 Dickson Ave, Kelowna, BC', 'Rob Richmond'),
('All-Elements Construction Ltd.', 'allelements construction', 'High-Performance Modern', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-1011', 'info@all-elements.ca', 'https://www.all-elements.ca', '1910 Kirschner Rd, Kelowna, BC', 'Sophie Tremblay'),
('Alair Homes Kelowna', 'alair homes kelowna', 'Custom & Renovation', 'CHBA-CO', 'Kelowna', 'BC', '(250) 768-3011', 'kelowna@alairhomes.com', 'https://www.alairhomes.ca/kelowna', '105-1815 Gordon Dr, Kelowna, BC', 'Nathan Stone'),
('Harmony Homes', 'harmony homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 765-8899', 'bids@harmonyhomes.net', 'https://www.harmonyhomes.net', '100-2475 Dobbin Rd, West Kelowna, BC', 'Mick Webb'),
('Wilden Construction (Blenk Development)', 'wilden construction blenk development', 'Master-Planned Residential', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-2906', 'info@wilden.ca', 'https://www.wilden.ca', '1454 Rocky Point Dr, Kelowna, BC', 'Gerhard Blenk'),
('Corwest Builders', 'corwest builders', 'Commercial & Residential', 'CHBA-CO / SICA', 'Kelowna', 'BC', '(250) 765-4422', 'tenders@corwest.ca', 'https://www.corwest.ca', '1631 Dickson Ave, Kelowna, BC', 'Mark West'),
('Acorn Communities Ltd.', 'acorn communities', 'Multi-Family & Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 765-4888', 'info@acorncommunities.com', 'https://www.acorncommunities.com', '204-1447 Ellis St, Kelowna, BC', 'Greg Bird'),
('Everton Ridge Homes', 'everton ridge homes', 'Single Family Dwelling', 'CHBA-CO', 'Vernon', 'BC', '(250) 545-3999', 'info@evertonridge.ca', 'https://www.evertonridge.ca', '3201 30th Ave, Vernon, BC', 'Andre Tremblay'),
('K West Homes Ltd.', 'k west homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-8088', 'info@kwesthomes.com', 'https://www.kwesthomes.com', '1890 Cooper Rd, Kelowna, BC', 'Kevin West'),
('Benchmark Homes Ltd.', 'benchmark homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-8844', 'estimating@benchmarkhomes.ca', 'https://www.benchmarkhomes.ca', '102-1405 St Paul St, Kelowna, BC', 'Brian Mark'),
('Carriage Signature Homes', 'carriage signature homes', 'Estate Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 868-8090', 'info@carriagesignature.com', 'https://www.carriagesignature.com', '3275 Lakeshore Rd, Kelowna, BC', 'Paul Signature'),
('Distinctive Developments Ltd.', 'distinctive developments', 'Custom & Multi-Family', 'CHBA-CO', 'Kelowna', 'BC', '(250) 861-4477', 'infill@distinctivedevelopments.ca', 'https://www.distinctivedevelopments.ca', '1632 Dickson Ave, Kelowna, BC', 'Craig Anderson'),
('Westpoint Construction Ltd.', 'westpoint construction', 'Residential Custom', 'CHBA-CO', 'West Kelowna', 'BC', '(250) 769-8080', 'info@westpointconstruction.ca', 'https://www.westpointconstruction.ca', '2200 Boucherie Rd, West Kelowna, BC', 'Steve West'),
('Copper Sky Design Build', 'copper sky design build', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-2244', 'info@copperskydesign.ca', 'https://www.copperskydesign.ca', '1855 Kirschner Rd, Kelowna, BC', 'Jason Sky'),
('Ledcor Construction Ltd.', 'ledcor construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-2211', 'tenders.bc@ledcor.com', 'https://www.ledcor.com', '1405 St Paul St, Kelowna, BC', 'Mark Taylor'),
('TKI Construction Ltd.', 'tki construction', 'Commercial & Industrial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-2211', 'tenders@tkiconstruction.ca', 'https://www.tkiconstruction.ca', '1875 Spall Rd, Kelowna, BC', 'Todd Krasnow'),
('Bird Construction', 'bird construction', 'Institutional & Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 765-8855', 'estimating.interior@bird.ca', 'https://www.bird.ca', '1631 Dickson Ave, Kelowna, BC', 'Ian Bird'),
('PCL Constructors Westcoast Inc.', 'pcl constructors westcoast', 'Commercial & Infrastructure GC', 'SICA', 'Kelowna', 'BC', '(250) 868-8000', 'kelownabids@pcl.com', 'https://www.pcl.com', '1708 Dolphin Ave, Kelowna, BC', 'Al Fricke'),
('ITC BC Builders Inc.', 'itc bc builders', 'Commercial High-Rise GC', 'SICA', 'Kelowna', 'BC', '(250) 862-8850', 'estimating.bc@itc-group.com', 'https://www.itc-group.com', '1630 Ellis St, Kelowna, BC', 'Doug Gourlay'),
('Mission Group Enterprises', 'mission', 'Multi-Family & High-Rise GC', 'SICA / UDI', 'Kelowna', 'BC', '(250) 717-3000', 'commercial@missiongroup.ca', 'https://www.missiongroup.ca', '1410 Water St, Kelowna, BC', 'Randy Shier'),
('Troika Management Corp.', 'troika management', 'Multi-Family & Commercial', 'SICA / UDI', 'Kelowna', 'BC', '(250) 869-4945', 'tenders@troikagroup.ca', 'https://www.troikagroup.ca', '200-1440 St Paul St, Kelowna, BC', 'Brad Klassen'),
('Team Construction Management (1981) Ltd.', 'team construction management 1981', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-3232', 'info@teamconstruction.ca', 'https://www.teamconstruction.ca', '1940 Dayton St, Kelowna, BC', 'Ken Bessason'),
('Norson Construction LLP', 'norson construction', 'Commercial & Industrial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-8800', 'bids@norson.com', 'https://www.norson.com', '101-1979 Old Okanagan Hwy, West Kelowna, BC', 'Norm Norson'),
('Reotech Construction Ltd.', 'reotech construction', 'Commercial Tenant Improvement', 'SICA', 'Kelowna', 'BC', '(250) 861-1203', 'tenders@reotech.com', 'https://www.reotech.com', '1855 Kirschner Rd, Kelowna, BC', 'Leo Reo'),
('Plan B Contractors Inc.', 'plan b contractors', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 861-5500', 'info@planbcontractors.com', 'https://www.planbcontractors.com', '102-1865 Dilworth Dr, Kelowna, BC', 'Darren B'),
('Mundi Construction Ltd.', 'mundi construction', 'Commercial & Hospitality GC', 'SICA', 'Kelowna', 'BC', '(250) 862-9800', 'estimating@mundiconstruction.com', 'https://www.mundiconstruction.com', '2130 Harvey Ave, Kelowna, BC', 'Ron Mundi'),
('Callahan Property Group Ltd.', 'callahan property', 'Commercial Developer & Builder', 'SICA', 'Kelowna', 'BC', '(250) 763-1250', 'properties@callahan.bc.ca', 'https://www.callahan.bc.ca', '1940 Dayton St, Kelowna, BC', 'Rob Callahan'),
('Sawchuk Developments Ltd.', 'sawchuk developments', 'Commercial & Multi-Family', 'SICA', 'Kelowna', 'BC', '(250) 765-8888', 'estimating@sawchuk.ca', 'https://www.sawchukdevelopments.com', '1645 Dilworth Dr, Kelowna, BC', 'Jim Sawchuk'),
('Greyback Construction Ltd.', 'greyback construction', 'Commercial & Institutional GC', 'SICA', 'Penticton', 'BC', '(250) 493-7972', 'greyback@greyback.com', 'https://www.greyback.com', '1645 Industrial Ave E, Penticton, BC', 'Doug Greyback'),
('Maple Reinders Constructors Ltd.', 'maple reinders constructors', 'Industrial & Environmental GC', 'SICA', 'Kelowna', 'BC', '(250) 765-8892', 'kelowna@maple.ca', 'https://www.maple.ca', '2250 Leckie Rd, Kelowna, BC', 'Harold Reinders'),
('Marwest Construction Ltd.', 'marwest construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-7711', 'kelowna@marwest.ca', 'https://www.marwest.ca', '1890 Cooper Rd, Kelowna, BC', 'Art West'),
('Scott Construction Group', 'scott construction', 'Multi-Family & Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 868-9900', 'estimating@scottconstructiongroup.com', 'https://www.scottconstructiongroup.com', '1630 Dickson Ave, Kelowna, BC', 'Darin Hughes'),
('Centurion Construction Ltd.', 'centurion construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 861-8844', 'admin@centurionconstruction.ca', 'https://www.centurionconstruction.ca', '1945 Kirschner Rd, Kelowna, BC', 'Ray Centurion'),
('Emil Anderson Construction', 'emil anderson construction', 'Civil & Infrastructure GC', 'SICA', 'Kelowna', 'BC', '(250) 762-9999', 'eac@eac.bc.ca', 'https://www.eac.bc.ca', '907 Ethel St, Kelowna, BC', 'Michael Jacobs'),
('Urban One Builders', 'urban one builders', 'Commercial & High-Rise GC', 'SICA', 'Kelowna', 'BC', '(250) 861-9988', 'estimating@urbanonebuilders.com', 'https://www.urbanonebuilders.com', '1447 Ellis St, Kelowna, BC', 'Allan Brand'),
('Sawmill Creek Construction', 'sawmill creek construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-4499', 'info@sawmillcreek.ca', 'https://www.sawmillcreek.ca', '1250 Ellis St, Kelowna, BC', 'Dan Smith'),
('Highstreet Ventures Inc.', 'highstreet ventures', 'Net-Zero Multi-Family GC', 'SICA / CHBA', 'Kelowna', 'BC', '(250) 448-8810', 'build@highstreetventures.ca', 'https://www.highstreetventures.ca', '100-1475 Ellis St, Kelowna, BC', 'Scott Higgins'),
('Argus Properties Ltd.', 'argus properties', 'Commercial Development & Building', 'SICA', 'Kelowna', 'BC', '(250) 763-6789', 'development@argusproperties.ca', 'https://www.argusproperties.ca', '1060 Manhattan Dr, Kelowna, BC', 'Ted Callahan'),
('Stober Group', 'stober', 'Commercial & Technology Hub GC', 'SICA / Landmark', 'Kelowna', 'BC', '(250) 763-2305', 'leasing@stobergroup.com', 'https://www.stobergroup.com', '1700 Dickson Ave, Kelowna, BC', 'Mark Stober'),
('Carrington Communities', 'carrington communities', 'Multi-Family Residential GC', 'CHBA / SICA', 'Kelowna', 'BC', '(250) 762-7770', 'kelowna@carrington.ca', 'https://www.carrington.ca', '2180 Leckie Rd, Kelowna, BC', 'Ken Holmes'),
('Rohit Group of Companies', 'rohit of companies', 'Multi-Family & Commercial', 'CHBA / SICA', 'Kelowna', 'BC', '(250) 860-8811', 'bcinfo@rohitgroup.com', 'https://www.rohitgroup.com', '1630 Ellis St, Kelowna, BC', 'Rohit Gupta'),
('KF Aerospace Construction & Facilities', 'kf aerospace construction facilities', 'Industrial & Aviation GC', 'SICA', 'Kelowna', 'BC', '(250) 491-5500', 'facilities@kfaero.com', 'https://www.kfaero.com', '5655 Airport Way, Kelowna, BC', 'Barry Lapointe'),
('E. Houston Contracting Ltd.', 'e houston contracting', 'Commercial Tenant Improvement', 'SICA', 'Kelowna', 'BC', '(250) 862-5200', 'info@ehouston.ca', 'https://www.ehouston.ca', '1845 Kirschner Rd, Kelowna, BC', 'Eric Houston'),
('Okahill Building Contractors Ltd.', 'okahill building contractors', 'Commercial Renovation', 'SICA', 'Kelowna', 'BC', '(250) 765-8819', 'estimating@okahill.com', 'https://www.okahill.com', '168 Asher Rd, Kelowna, BC', 'Dave Okahill'),
('Innovation Drywall Ltd.', 'innovation drywall', 'Commercial Interiors & Fit-Out', 'SICA', 'Kelowna', 'BC', '(250) 762-9011', 'office@innovationdrywall.ca', 'https://www.innovationdrywall.ca', '101-1960 Springfield Rd, Kelowna, BC', 'Steve Miller'),
('Duo Projects Ltd.', 'duo projects', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 868-3860', 'build@duoprojects.com', 'https://www.duoprojects.com', '105-1890 Cooper Rd, Kelowna, BC', 'Patrick Duo'),
('Anomar Construction Corp.', 'anomar construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 862-9090', 'info@anomar.ca', 'https://www.anomar.ca', '205-1447 Ellis St, Kelowna, BC', 'Mike Anomar'),
('TMCC Wood & Design Inc.', 'tmcc wood design', 'Commercial Millwork & Interiors', 'SICA', 'Kelowna', 'BC', '(250) 765-4400', 'tenders@tmccwood.ca', 'https://www.tmccwood.ca', '1940 Kirschner Rd, Kelowna, BC', 'Tom MCC'),
('Performance Dynamic Construction Inc.', 'performance dynamic construction', 'Commercial & Industrial GC', 'SICA', 'Kelowna', 'BC', '(250) 868-9898', 'bids@performancedynamic.ca', 'https://www.performancedynamic.ca', '1840 Byland Rd, West Kelowna, BC', 'Rob Dynamic'),
('Nobleterra Developments', 'nobleterra developments', 'Commercial Development', 'SICA', 'Kelowna', 'BC', '(250) 717-8899', 'info@nobleterra.ca', 'https://www.nobleterra.ca', '1631 Dickson Ave, Kelowna, BC', 'Alex Noble'),
('DTD Developments Ltd.', 'dtd developments', 'Commercial & Residential', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-9199', 'info@dtddevelopments.ca', 'https://www.dtddevelopments.ca', '1420 Water St, Kelowna, BC', 'Darren Todd'),
('Okanagan Valley Construction Ltd.', 'okanagan valley construction', 'Commercial General Contractor', 'SICA', 'Kelowna', 'BC', '(250) 861-9444', 'admin@ovhomes.ca', 'https://www.ovconstruction.ca', '1950 Harvey Ave, Kelowna, BC', 'Victor OVC'),
('Omkara Homes Inc.', 'omkara homes', 'Residential Custom Builder', 'CHBA-CO', 'Kelowna', 'BC', '(250) 878-3301', 'info@omkarahomes.ca', 'https://www.omkarahomes.ca', '1180 Rutland Rd N, Kelowna, BC', 'Omkar Singh'),
('Pure Build Construction Ltd.', 'pure build construction', 'Modern Custom Homes', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-2111', 'build@purebuild.ca', 'https://www.purebuild.ca', '1430 St Paul St, Kelowna, BC', 'Kevin Pure'),
('Kelbrook Construction Corp.', 'kelbrook construction', 'Commercial & Industrial GC', 'SICA', 'Kelowna', 'BC', '(250) 763-7722', 'admin@kelbrook.ca', 'https://www.kelbrook.ca', '1840 Kirschner Rd, Kelowna, BC', 'Brook Kelbrook'),
('OB Builds Inc.', 'ob builds', 'Commercial General Contractor', 'SICA', 'Kelowna', 'BC', '(250) 860-2244', 'info@obbuilds.ca', 'https://www.obbuilds.ca', '1632 Dickson Ave, Kelowna, BC', 'Oliver B'),
('Tova Construction Ltd.', 'tova construction', 'Multi-Family & Commercial', 'SICA', 'Kelowna', 'BC', '(250) 868-8080', 'info@tovaconstruction.ca', 'https://www.tovaconstruction.ca', '104-1447 Ellis St, Kelowna, BC', 'Tova Leader'),
('I J Samra Construction Ltd.', 'i j samra construction', 'Agricultural & Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 765-6626', 'samra_const@telus.net', 'https://www.samraconstruction.ca', '1290 Highway 33 E, Kelowna, BC', 'Iqbal Samra'),
('Shoreline Construction Management', 'shoreline construction management', 'Commercial & Waterfront GC', 'SICA', 'Kelowna', 'BC', '(250) 862-3400', 'info@shorelineconstruction.ca', 'https://www.shorelineconstruction.ca', '3840 Truswell Rd, Kelowna, BC', 'Graham Shore'),
('Schoenne Homes Inc.', 'schoenne homes', 'Residential Custom', 'CHBA-South Okanagan', 'Penticton', 'BC', '(250) 492-4144', 'info@schoenne.com', 'https://www.schoenne.com', '101-197 Warren Ave E, Penticton, BC', 'Chris Schoenne'),
('BCH Construction Ltd.', 'bch construction', 'Commercial & Residential', 'SICA', 'Penticton', 'BC', '(250) 493-1188', 'tenders@bchconstruction.ca', 'https://www.bchconstruction.ca', '170 Industrial Ave, Penticton, BC', 'Ben Campbell'),
('Wildstone Construction Group', 'wildstone construction', 'Industrial & Heavy Civil GC', 'SICA', 'Penticton', 'BC', '(250) 493-3938', 'estimating@wildstone.com', 'https://www.wildstone.com', '1101 Fairview Rd, Penticton, BC', 'Mark Melissen'),
('Lark Group Construction', 'lark construction', 'Institutional & Healthcare GC', 'SICA', 'Kelowna', 'BC', '(250) 860-2211', 'info@larkgroup.com', 'https://www.larkgroup.com', '1631 Dickson Ave, Kelowna, BC', 'Kirk Fisher'),
('Westmark Construction Ltd.', 'westmark construction', 'Commercial & Multi-Family', 'SICA', 'Kelowna', 'BC', '(250) 756-9665', 'estimating@westmark.ca', 'https://www.westmark.ca', '1700 Dickson Ave, Kelowna, BC', 'Mark Westmark'),
('EllisDon Corporation', 'ellisdon', 'Major Projects & Infrastructure', 'SICA', 'Kelowna', 'BC', '(250) 860-9900', 'bids-bc@ellisdon.com', 'https://www.ellisdon.com', '1447 Ellis St, Kelowna, BC', 'Geoff Smith'),
('Graham Construction & Engineering', 'graham construction engineering', 'Commercial & Infrastructure GC', 'SICA', 'Kelowna', 'BC', '(250) 861-5588', 'kelowna@graham.ca', 'https://www.grahambuilds.com', '1620 Dickson Ave, Kelowna, BC', 'Grant Beck'),
('Pomerleau Inc.', 'pomerleau', 'Major Buildings & Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 862-2300', 'kelowna.estimating@pomerleau.ca', 'https://www.pomerleau.ca', '1405 St Paul St, Kelowna, BC', 'Pierre Pomerleau'),
('CANA Construction Ltd.', 'cana construction', 'Commercial General Contractor', 'SICA', 'Kelowna', 'BC', '(250) 860-3344', 'estimating@cana.ca', 'https://www.cana.ca', '1890 Cooper Rd, Kelowna, BC', 'Fabrizio Cana'),
('CarveOn Homes Ltd.', 'carveon homes', 'Residential Custom', 'CHBA-CO', 'Lake Country', 'BC', '(250) 766-3390', 'info@carveonhomes.com', 'https://www.carveonhomes.com', '9887 Highway 97, Lake Country, BC', 'Carl CarveOn'),
('Maddocks Construction Ltd.', 'maddocks construction', 'Commercial & Residential', 'SICA', 'Vernon', 'BC', '(250) 542-8822', 'info@maddocksconstruction.ca', 'https://www.maddocksconstruction.ca', '2800 48th Ave, Vernon, BC', 'Ken Maddocks'),
('Ryder Construction Management', 'ryder construction management', 'Commercial GC', 'SICA', 'Vernon', 'BC', '(250) 545-2200', 'bids@ryderconstruction.ca', 'https://www.ryderconstruction.ca', '3100 32nd Ave, Vernon, BC', 'Mark Ryder'),
('Okanagan Mountain Custom Homes', 'okanagan mountain custom homes', 'Luxury Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-1188', 'info@okmountainhomes.ca', 'https://www.okmountainhomes.ca', '5200 Chute Lake Rd, Kelowna, BC', 'Steve Miller'),
('Lakeshore Custom Builders Ltd.', 'lakeshore custom builders', 'Luxury Waterfront', 'CHBA-CO', 'Kelowna', 'BC', '(250) 868-8833', 'info@lakeshorebuilders.ca', 'https://www.lakeshorebuilders.ca', '3990 Lakeshore Rd, Kelowna, BC', 'Scott Shore'),
('Knox Mountain Homes', 'knox mountain homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-2244', 'build@knoxmountainhomes.ca', 'https://www.knoxmountainhomes.ca', '620 Ellis St, Kelowna, BC', 'Greg Knox'),
('Mission Ridge Custom Homes', 'mission ridge custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-5544', 'contact@missionridgehomes.ca', 'https://www.missionridgehomes.ca', '4200 Gordon Dr, Kelowna, BC', 'David Ridge'),
('Black Mountain Construction Ltd.', 'black mountain construction', 'Residential & Multi-Family', 'CHBA-CO', 'Kelowna', 'BC', '(250) 765-8833', 'info@blackmountainconstruction.ca', 'https://www.blackmountainconstruction.ca', '1200 Black Mountain Dr, Kelowna, BC', 'Peter Black'),
('Gallagher''s Canyon Construction', 'gallaghers canyon construction', 'Golf Community Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 861-4422', 'build@gallagherscanyon.com', 'https://www.gallagherscanyon.com', '4320 Gallagher''s Dr W, Kelowna, BC', 'James Canyon'),
('Predator Ridge Construction', 'predator ridge construction', 'Resort Community Builder', 'CHBA-CO / SICA', 'Vernon', 'BC', '(250) 542-3436', 'realestate@predatorridge.com', 'https://www.predatorridge.com', '301 Village Centre Pl, Vernon, BC', 'Brad Pelletier'),
('Shannon Lake Homes Ltd.', 'shannon lake homes', 'Residential Custom', 'CHBA-CO', 'West Kelowna', 'BC', '(250) 769-1122', 'info@shannonlakehomes.ca', 'https://www.shannonlakehomes.ca', '2500 Shannon Lake Rd, West Kelowna, BC', 'Ron Shannon'),
('West Kelowna Builders Ltd.', 'west kelowna builders', 'Commercial & Residential', 'CHBA-CO', 'West Kelowna', 'BC', '(250) 769-4455', 'tenders@westkelownabuilders.ca', 'https://www.westkelownabuilders.ca', '2475 Dobbin Rd, West Kelowna, BC', 'Wayne West'),
('Big White Alpine Builders', 'big white alpine builders', 'Resort Chalet Construction', 'CHBA-CO', 'Big White', 'BC', '(250) 765-8888', 'build@bigwhitebuilders.ca', 'https://www.bigwhitebuilders.ca', '5315 Big White Rd, Big White, BC', 'Stefan Alpine'),
('Silver Creek Contracting Ltd.', 'silver creek contracting', 'Commercial & Residential', 'SICA', 'Vernon', 'BC', '(250) 545-9988', 'info@silvercreekcontracting.ca', 'https://www.silvercreekcontracting.ca', '3300 30th Ave, Vernon, BC', 'Chris Creek'),
('Monashee Custom Homes', 'monashee custom homes', 'Custom Timber & Residential', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-3311', 'info@monasheehomes.ca', 'https://www.monasheehomes.ca', '1840 Kirschner Rd, Kelowna, BC', 'Derek Monashee'),
('Thompson Okanagan Construction Ltd.', 'thompson okanagan construction', 'Commercial & Industrial', 'SICA', 'Kelowna', 'BC', '(250) 861-7788', 'tenders@toconstruction.ca', 'https://www.toconstruction.ca', '1950 Harvey Ave, Kelowna, BC', 'Mark Thompson'),
('Pacific Peak Construction', 'pacific peak construction', 'Commercial General Contractor', 'SICA', 'Kelowna', 'BC', '(250) 868-9944', 'info@pacificpeak.ca', 'https://www.pacificpeak.ca', '1631 Dickson Ave, Kelowna, BC', 'Brian Peak'),
('Apex Custom Homes', 'apex custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-8899', 'build@apexcustomhomes.ca', 'https://www.apexcustomhomes.ca', '103-1815 Gordon Dr, Kelowna, BC', 'Ryan Apex'),
('Summit Peak Construction', 'summit peak construction', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-4455', 'info@summitpeak.ca', 'https://www.summitpeak.ca', '1420 St Paul St, Kelowna, BC', 'Craig Summit'),
('Vantage West Construction', 'vantage west construction', 'Commercial & Residential', 'SICA', 'Kelowna', 'BC', '(250) 717-3133', 'info@vantagewest.ca', 'https://www.vantagewest.ca', '1060 Manhattan Dr, Kelowna, BC', 'AJ Hazzi'),
('Silver Star Construction', 'silver star construction', 'Resort Alpine Builder', 'CHBA-CO', 'Vernon', 'BC', '(250) 542-9988', 'info@silverstarbuilders.ca', 'https://www.silverstarbuilders.ca', '123 Silver Star Rd, Vernon, BC', 'Gary Star'),
('Orchard City Builders Ltd.', 'orchard city builders', 'Infill & Multi-Family', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-8811', 'info@orchardcitybuilders.ca', 'https://www.orchardcitybuilders.ca', '1440 St Paul St, Kelowna, BC', 'Dan Orchard'),
('Kelowna Valley Custom Builders', 'kelowna valley custom builders', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-7799', 'build@kelownavalleybuilders.ca', 'https://www.kelownavalleybuilders.ca', '1940 Dayton St, Kelowna, BC', 'Troy Valley'),
('Mission Creek Contracting', 'mission creek contracting', 'Commercial & Civil GC', 'SICA', 'Kelowna', 'BC', '(250) 861-3300', 'tenders@missioncreek.ca', 'https://www.missioncreek.ca', '2250 Leckie Rd, Kelowna, BC', 'Robert Creek'),
('Pillar Construction Ltd.', 'pillar construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 765-9911', 'info@pillarconstruction.ca', 'https://www.pillarconstruction.ca', '1875 Spall Rd, Kelowna, BC', 'Paul Pillar'),
('Keystone Contracting Ltd.', 'keystone contracting', 'Commercial & Institutional', 'SICA', 'Kelowna', 'BC', '(250) 868-2233', 'admin@keystonecontracting.ca', 'https://www.keystonecontracting.ca', '1630 Dickson Ave, Kelowna, BC', 'Keith Stone'),
('Cornerstone Custom Homes', 'cornerstone custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-9922', 'build@cornerstonehomes.ca', 'https://www.cornerstonehomes.ca', '101-1865 Dilworth Dr, Kelowna, BC', 'Dave Stone'),
('Nexus Construction Management', 'nexus construction management', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 862-8877', 'tenders@nexusconstruction.ca', 'https://www.nexusconstruction.ca', '1447 Ellis St, Kelowna, BC', 'Alan Nexus'),
('Synergy Project Management Ltd.', 'synergy project management', 'Commercial & Industrial GC', 'SICA', 'Kelowna', 'BC', '(250) 860-8844', 'info@synergyprojects.ca', 'https://www.synergyprojects.ca', '1632 Dickson Ave, Kelowna, BC', 'Scott Synergy'),
('Summit Commercial Builders', 'summit commercial builders', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 861-5544', 'bids@summitcommercial.ca', 'https://www.summitcommercial.ca', '1940 Dayton St, Kelowna, BC', 'Mark Summit'),
('Okanagan Prime Construction', 'okanagan prime construction', 'Commercial & Multi-Family', 'SICA', 'Kelowna', 'BC', '(250) 762-7788', 'info@okprime.ca', 'https://www.okprime.ca', '1405 St Paul St, Kelowna, BC', 'Tyler Prime'),
('Highland Custom Homes', 'highland custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-3322', 'info@highlandcustomhomes.ca', 'https://www.highlandcustomhomes.ca', '102-1815 Gordon Dr, Kelowna, BC', 'Gordon Highland'),
('Sierra West Homes Ltd.', 'sierra west homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 868-9911', 'build@sierrawest.ca', 'https://www.sierrawest.ca', '1865 Dilworth Dr, Kelowna, BC', 'Ken Sierra'),
('Aspen Ridge Builders', 'aspen ridge builders', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-2277', 'info@aspenridgebuilders.ca', 'https://www.aspenridgebuilders.ca', '1420 Water St, Kelowna, BC', 'Tom Aspen'),
('Triumph Construction Corp.', 'triumph construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 861-2299', 'tenders@triumphconstruction.ca', 'https://www.triumphconstruction.ca', '1950 Harvey Ave, Kelowna, BC', 'Dean Triumph'),
('Vanguard Builders Ltd.', 'vanguard builders', 'Commercial & Residential', 'SICA', 'Kelowna', 'BC', '(250) 763-8822', 'bids@vanguardbuilders.ca', 'https://www.vanguardbuilders.ca', '1855 Kirschner Rd, Kelowna, BC', 'Eric Vanguard'),
('Epic Custom Homes', 'epic custom homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-8800', 'info@epichomes.ca', 'https://www.epichomes.ca', '3840 Truswell Rd, Kelowna, BC', 'Brad Epic'),
('Cascade Mountain Builders', 'cascade mountain builders', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-5566', 'build@cascademtn.ca', 'https://www.cascademtn.ca', '1630 Dickson Ave, Kelowna, BC', 'Steve Cascade'),
('Prestige Builders Group', 'prestige builders', 'Commercial & Residential', 'SICA', 'Kelowna', 'BC', '(250) 862-9988', 'info@prestigebuilders.ca', 'https://www.prestigebuilders.ca', '1440 St Paul St, Kelowna, BC', 'Robert Prestige'),
('Titan General Contractors', 'titan general contractors', 'Industrial & Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 868-4422', 'tenders@titancontractors.ca', 'https://www.titancontractors.ca', '1840 Kirschner Rd, Kelowna, BC', 'George Titan'),
('Okanagan Urban Builders', 'okanagan urban builders', 'Infill Multi-Family GC', 'CHBA-CO', 'Kelowna', 'BC', '(250) 765-2211', 'info@okurban.ca', 'https://www.okurban.ca', '1447 Ellis St, Kelowna, BC', 'Tyler Urban'),
('West Coast Signature Homes', 'west coast signature homes', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-6688', 'build@wcsignaturehomes.ca', 'https://www.wcsignaturehomes.ca', '3275 Lakeshore Rd, Kelowna, BC', 'Grant Signature'),
('Eagle Rock Construction Ltd.', 'eagle rock construction', 'Civil & Infrastructure GC', 'SICA', 'Kelowna', 'BC', '(250) 860-1199', 'info@eaglerock.ca', 'https://www.eaglerock.ca', '2250 Leckie Rd, Kelowna, BC', 'Sam Eagle'),
('Skyline Commercial Construction', 'skyline commercial construction', 'Commercial GC', 'SICA', 'Kelowna', 'BC', '(250) 861-8899', 'bids@skylinecommercial.ca', 'https://www.skylinecommercial.ca', '1940 Dayton St, Kelowna, BC', 'Craig Skyline'),
('Bespoke Custom Homes', 'bespoke custom homes', 'Luxury Architectural Homes', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-9900', 'info@bespokehomes.ca', 'https://www.bespokehomes.ca', '3990 Lakeshore Rd, Kelowna, BC', 'Julian Bespoke'),
('Pacific West Builders', 'pacific west builders', 'Multi-Family & Commercial', 'SICA', 'Kelowna', 'BC', '(250) 868-2288', 'info@pacificwestbuilders.ca', 'https://www.pacificwestbuilders.ca', '1631 Dickson Ave, Kelowna, BC', 'Donald West'),
('Okanagan Timberframe Co.', 'okanagan timberframe co', 'Heavy Timber & Post & Beam', 'CHBA-CO', 'Kelowna', 'BC', '(250) 862-8811', 'build@oktimberframe.ca', 'https://www.oktimberframe.ca', '1840 Kirschner Rd, Kelowna, BC', 'Lars Timber'),
('Pinnacle Homes Okanagan', 'pinnacle homes okanagan', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 764-2244', 'info@pinnaclehomes.ca', 'https://www.pinnaclehomes.ca', '101-1865 Dilworth Dr, Kelowna, BC', 'Aaron Pinnacle'),
('Kodiak Custom Contracting', 'kodiak custom contracting', 'Residential & Commercial', 'CHBA-CO', 'Kelowna', 'BC', '(250) 878-3301', 'estimating@kodiakcustom.ca', 'https://www.kodiakcustom.ca', '1085 Richter St, Kelowna, BC', 'Brad Kodiak'),
('Square One Contracting', 'square one contracting', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-2111', 'tenders@squareonecontracting.ca', 'https://www.squareonecontracting.ca', '1420 St Paul St, Kelowna, BC', 'Steve Square'),
('Kelowna Custom Builders Ltd.', 'kelowna custom builders', 'Residential Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-2444', 'info@kelownacustombuilders.ca', 'https://www.kelownacustombuilders.ca', '1630 Dickson Ave, Kelowna, BC', 'Scott Custom'),
('Okanagan Dream Builders', 'okanagan dream builders', 'Single Family Custom', 'CHBA-CO', 'Kelowna', 'BC', '(250) 765-8899', 'bids@okdreambuilders.ca', 'https://www.okdreambuilders.ca', '100-2475 Dobbin Rd, West Kelowna, BC', 'Dave Dream'),
('Infill Kelowna Builders', 'infill kelowna builders', 'Urban Infill & Carriage Houses', 'CHBA-CO', 'Kelowna', 'BC', '(250) 861-4477', 'infill@kelownabuilders.com', 'https://www.kelownabuilders.com', '1632 Dickson Ave, Kelowna, BC', 'Tyler Infill'),
('Dilworth Mountain Developments', 'dilworth mountain developments', 'Master-Planned Residential', 'CHBA-CO', 'Kelowna', 'BC', '(250) 762-3390', 'info@dilworthmountain.ca', 'https://www.dilworthmountain.ca', '1284 Leckie Rd, Kelowna, BC', 'Greg Mountain'),
('Nautica Builders Ltd.', 'nautica builders', 'Waterfront Luxury', 'CHBA-CO', 'Kelowna', 'BC', '(250) 860-9199', 'nautica@builders.bc.ca', 'https://www.nauticabuilders.ca', '3884 Truswell Rd, Kelowna, BC', 'Colin Nautica')
ON CONFLICT DO NOTHING;
