-- Table for storing supplies inventory
-- =========================================================
-- STEP 1: CREATE TABLES (PostgreSQL Schema)
-- =========================================================

-- 1. Create Categories Table
CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(255)
);

-- 2. Create Suppliers Table
CREATE TABLE Suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_details VARCHAR(255)
);

-- 3. Create Offices Table (For RSMI Responsibility Centers)
CREATE TABLE Offices (
    office_id SERIAL PRIMARY KEY,
    office_name VARCHAR(150) NOT NULL,
    acronym VARCHAR(20),
    dept_code VARCHAR(20)
);

-- 4. Create Items Table (The core inventory)
CREATE TABLE Items (
    item_id SERIAL PRIMARY KEY,
    item_code VARCHAR(50), 
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    size VARCHAR(100),
    unit_of_measure VARCHAR(20), 
    unit_price DECIMAL(10, 2),
    category_id INT,
    supplier_id INT,
    current_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id)
);

-- 5. Create Transactions Table (For Deliveries and RSMI Issuances)
CREATE TABLE Transactions (
    transaction_id SERIAL PRIMARY KEY,
    ris_no VARCHAR(50), 
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('IN', 'OUT')) NOT NULL, 
    transaction_date DATE NOT NULL,
    office_id INT, 
    received_by VARCHAR(150),
    delivery_receipt VARCHAR(255),
    delivery_number VARCHAR(100),
    remarks TEXT,
    request_id INT,
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- 6. Create Transaction Details Table (The specific items inside a transaction)
CREATE TABLE Transaction_Details (
    detail_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10, 2),
    FOREIGN KEY (transaction_id) REFERENCES Transactions(transaction_id),
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- 7. Create Requests Table (For Pending Supply Requests)
CREATE TABLE Requests (
    request_id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    office_id INT NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purpose TEXT,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    justification TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PARTIAL', 'REJECTED', 'CANCELLED', 'RELEASED')),
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- 8. Create Request Details Table (Items requested)
CREATE TABLE Request_Details (
    rd_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    approved_quantity INT, -- For partial fulfillment
    FOREIGN KEY (request_id) REFERENCES Requests(request_id),
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- 9. Create Users Table (For Login/Authentication)
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, this should be hashed (e.g., bcrypt)
    email VARCHAR(100),
    office VARCHAR(100),
    office_id INT,
    role VARCHAR(50) DEFAULT 'STAFF', -- 'ADMIN' or 'STAFF' or 'FOCAL_USER' or 'SUPERADMIN'
    status VARCHAR(20) DEFAULT 'Active', -- 'Active' or 'Inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- 10. Create System Settings Table
CREATE TABLE System_Settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Create Audit Logs Table
CREATE TABLE Audit_Logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT,
    username VARCHAR(50),
    action VARCHAR(50),
    entity VARCHAR(50),
    entity_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Create Notifications Table
CREATE TABLE Notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT,
    office_id INT,
    target_role VARCHAR(50), -- e.g., 'SUPPLY_OFFICER', 'FOCAL_OFFICER'
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
    is_read BOOLEAN DEFAULT FALSE,
    action_link VARCHAR(255),
    action_label VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- =========================================================
-- STEP 2: INSERT DEFAULT DATA
-- =========================================================

-- Insert Default Settings
INSERT INTO System_Settings (setting_key, setting_value) VALUES 
('email_new_requests', 'false'),
('email_on_approval', 'false'),
('email_on_release', 'false'),
('email_low_stock', 'false'),
('in_system_alert', 'true'),
('low_stock_alert', 'false'),
('notification_sound', 'false'),
('email_server', 'bsp-ims@scouts.gov.ph');

-- Insert Corrected Offices
INSERT INTO Offices (office_name, acronym, dept_code) VALUES 
('OFFICE OF THE SECRETARY GENERAL', 'OSG', 'OSG'),
('OFFICE OF THE BOARD SECRETARY', 'OBS', 'OBS'),
('OFFICE OF THE DEPUTY SECRETARY GENERAL', 'ODSG', 'ODSG'),
('OFFICE OF THE NATIONAL PRESIDENT', 'ONP', 'ONP'),
('LEGAL SERVICES OFFICE', 'LSO', 'LSO'),
('FIELD OPERATIONS DIVISION', 'FOD', 'FOD'),
('CORPORATE PLANNING AND STRATEGIC MANAGEMENT OFFICE', 'CPSMO', 'CPSMO'),
('ADMINISTRATION DIVISION', 'ADMIN', 'ADMIN'),
('FINANCE DIVISION', 'FINANCE', 'FINANCE'),
('NATIONAL SCOUT SHOP', 'NSS', 'NSS'),
('INTERNAL AUDIT OFFICE', 'IAO', 'IAO'),
('PROPERTY MANAGEMENT AND DEVELOPMENT DIVISION', 'PMDD', 'PMDD');

-- Insert a Default Admin User (Password: admin123)
INSERT INTO Users (username, password, role) VALUES ('admin', 'admin123', 'SUPERADMIN');

-- Insert Focal Officer Accounts (Default Password: BSPLagingHanda - Note: These should be hashed in production)
INSERT INTO Users (username, password, email, office, role, status) VALUES 
('focal_osg', 'BSPLagingHanda', 'osg.focal@scouts.gov.ph', 'OSG', 'FOCAL_OFFICER', 'Active'),
('focal_obs', 'BSPLagingHanda', 'obs.focal@scouts.gov.ph', 'OBS', 'FOCAL_OFFICER', 'Active'),
('focal_odsg', 'BSPLagingHanda', 'odsg.focal@scouts.gov.ph', 'ODSG', 'FOCAL_OFFICER', 'Active'),
('focal_onp', 'BSPLagingHanda', 'onp.focal@scouts.gov.ph', 'ONP', 'FOCAL_OFFICER', 'Active'),
('focal_lso', 'BSPLagingHanda', 'lso.focal@scouts.gov.ph', 'LSO', 'FOCAL_OFFICER', 'Active'),
('focal_fod', 'BSPLagingHanda', 'fod.focal@scouts.gov.ph', 'FOD', 'FOCAL_OFFICER', 'Active'),
('focal_cpsmo', 'BSPLagingHanda', 'cpsmo.focal@scouts.gov.ph', 'CPSMO', 'FOCAL_OFFICER', 'Active'),
('focal_admin', 'BSPLagingHanda', 'admin.focal@scouts.gov.ph', 'ADMIN', 'FOCAL_OFFICER', 'Active'),
('focal_finance', 'BSPLagingHanda', 'finance.focal@scouts.gov.ph', 'FINANCE', 'FOCAL_OFFICER', 'Active'),
('focal_nss', 'BSPLagingHanda', 'nss.focal@scouts.gov.ph', 'NSS', 'FOCAL_OFFICER', 'Active'),
('focal_iao', 'BSPLagingHanda', 'iao.focal@scouts.gov.ph', 'IAO', 'FOCAL_OFFICER', 'Active'),
('focal_pmdd', 'BSPLagingHanda', 'pmdd.focal@scouts.gov.ph', 'PMDD', 'FOCAL_OFFICER', 'Active'),
('sir_jerry', 'BSPLagingHanda', 'jerry.property@scouts.gov.ph', 'PMDD', 'ACTING_PROPERTY_CUSTODIAN', 'Active');
