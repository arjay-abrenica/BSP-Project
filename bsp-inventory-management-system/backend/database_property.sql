-- 1. IAR_Records (Header for the Inspection & Acceptance Report)
CREATE TABLE IF NOT EXISTS IAR_Records (
    iar_id SERIAL PRIMARY KEY,
    iar_no VARCHAR(50) UNIQUE NOT NULL,
    entity_name VARCHAR(100) DEFAULT 'Boy Scouts of the Philippines',
    fund_cluster VARCHAR(100),
    supplier_name VARCHAR(255) NOT NULL,
    po_pr_no VARCHAR(50),
    po_pr_date DATE,
    requisitioning_office VARCHAR(255),
    responsibility_center_code VARCHAR(100),
    iar_date DATE DEFAULT CURRENT_DATE,
    invoice_dr_no VARCHAR(50),
    invoice_date DATE,
    
    -- Inspection Details
    inspection_date DATE,
    inspected_by VARCHAR(255),
    inspected_by_designation VARCHAR(255),
    inspection_status TEXT DEFAULT 'Found in order as to quantity and specifications',
    
    -- Acceptance Details
    received_date DATE,
    accepted_by VARCHAR(255),
    accepted_by_designation VARCHAR(255),
    acceptance_status VARCHAR(50) DEFAULT 'Complete',
    
    created_at TIMESTAMP DEFAULT CURRENT_DATE
);

-- 2. IAR_Line_Items (Groups items as received in IAR)
CREATE TABLE IF NOT EXISTS IAR_Line_Items (
    iar_line_id SERIAL PRIMARY KEY,
    iar_id INTEGER REFERENCES IAR_Records(iar_id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    unit VARCHAR(50),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    rco VARCHAR(255), -- Responsibility Center Office
    accountable_officer VARCHAR(255),
    delivery_date DATE
);

-- 3. Property_Items (The Main Database / Main storage for PAR and ICS)
-- This table stores individual units for serialized tracking (Step 3)
-- Items > 50k are classified as PAR (RPCPPE)
-- Items < 50k are classified as ICS (RPCSP)
CREATE TABLE IF NOT EXISTS Property_Items (
    property_id SERIAL PRIMARY KEY,
    property_no VARCHAR(100) UNIQUE NOT NULL,
    iar_id INTEGER REFERENCES IAR_Records(iar_id),
    iar_line_id INTEGER REFERENCES IAR_Line_Items(iar_line_id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    serial_no VARCHAR(100),
    unit_cost DECIMAL(15, 2) NOT NULL,
    or_no VARCHAR(100), -- Official Receipt (Required for PAR > 50k)
    
    -- Classification Logic
    type VARCHAR(10) CHECK (type IN ('PAR', 'ICS')), -- Above 50k = PAR, Below 50k = ICS
    
    -- Custodianship (Step 1 & 2)
    accountable_officer VARCHAR(255) NOT NULL,
    rco VARCHAR(255), -- Office/Employee assignment
    office_id INTEGER REFERENCES Offices(office_id),
    
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, TRANSFERRED, RETURNED, DISPOSED
    condition VARCHAR(50) DEFAULT 'GOOD', -- GOOD, FAIR, POOR, UNUSABLE
    delivery_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_DATE
);

-- 4. Property_Transfers (Step 2 - Tracking per employee)
CREATE TABLE IF NOT EXISTS Property_Transfers (
    transfer_id SERIAL PRIMARY KEY,
    ptr_no VARCHAR(50) UNIQUE, -- Property Transfer Report No
    property_id INTEGER REFERENCES Property_Items(property_id),
    transfer_date DATE DEFAULT CURRENT_DATE,
    transfer_type VARCHAR(50), -- TRANSFER, RELINQUISH
    from_officer VARCHAR(255),
    to_officer VARCHAR(255),
    to_office_id INTEGER REFERENCES Offices(office_id),
    reason TEXT,
    received_by VARCHAR(255),
    approved_by VARCHAR(255)
);

-- 5. Property_Returns (Step 2 - When items are returned to stock)
CREATE TABLE IF NOT EXISTS Property_Returns (
    return_id SERIAL PRIMARY KEY,
    prs_no VARCHAR(50) UNIQUE, -- Property Return Slip No
    property_id INTEGER REFERENCES Property_Items(property_id),
    return_date DATE DEFAULT CURRENT_DATE,
    returned_by VARCHAR(255),
    received_by VARCHAR(255),
    reason TEXT,
    condition_on_return VARCHAR(50)
);
