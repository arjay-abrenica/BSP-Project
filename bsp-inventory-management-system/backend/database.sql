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
    unit_of_measure VARCHAR(20), 
    unit_price DECIMAL(10, 2),
    category_id INT,
    supplier_id INT,
    current_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
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
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'CANCELLED')),
    FOREIGN KEY (office_id) REFERENCES Offices(office_id)
);

-- 8. Create Request Details Table (Items requested)
CREATE TABLE Request_Details (
    rd_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
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
    role VARCHAR(50) DEFAULT 'STAFF', -- 'ADMIN' or 'STAFF' or 'FOCAL_USER' or 'SUPERADMIN'
    status VARCHAR(20) DEFAULT 'Active', -- 'Active' or 'Inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create System Settings Table
CREATE TABLE System_Settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- =========================================================
-- STEP 2: INSERT SAMPLE DATA
-- =========================================================

INSERT INTO Categories (category_name) VALUES ('OFFICE SUPPLIES'), ('ELECTRICAL'), ('HARDWARE'), ('MEDICAL/SANITARY');
INSERT INTO Suppliers (supplier_name) VALUES ('CHAMPION HARDWARE & CO. INC.'), ('PS-PHILGEPS');
INSERT INTO Offices (office_name, acronym, dept_code) VALUES 
('NATIONAL SCOUT SHOP', 'SS', 'NSS'), 
('SUPPLY UNIT/ADMIN', 'SU', 'ADMIN'),
('OFFICE OF THE SECRETARY GENERAL', 'SG', 'OSG'),
('CORPORATE PLANNING AND STRATEGY MANAGEMENT OFFICE', 'CO', 'CPSMO'),
('INTERNAL AUDIT OFFICE', 'IA', 'IAO');

INSERT INTO Items (item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, current_stock) VALUES 
('494', 'FLOURESCENT LAMP (40WATTS) O/T', 'CITY LIGHT', 'PCS', 180.00, 2, 1, 17),
('499', 'LONG NOSE PLIER', 'STANLEY', 'PCS', 320.00, 3, 1, 1),
(NULL, 'ALCOHOL, 500 ML, 70% GREENCROSS', 'BOTTLE', 'BOT', 55.62, 4, 2, 9),
(NULL, 'BOND PAPER A4', 'PARAMOUNT PAPER A4', 'RMS', 0.00, 1, NULL, 50),
(NULL, 'MASKING TAPE 2"', 'MASKING TAPE', 'ROLL', 0.00, 1, NULL, 15);

INSERT INTO Transactions (ris_no, transaction_type, transaction_date, office_id, received_by, remarks) VALUES 
('24-05-0062', 'OUT', '2024-05-31', 1, 'JUAN DELA CRUZ', 'RSMI MAY 2024 ISSUANCE');

INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) VALUES (1, 4, 2, 0.00), (1, 3, 1, 55.62), (1, 5, 1, 0.00);

-- Insert Sample Requests
INSERT INTO Requests (request_number, office_id, request_date, purpose) VALUES 
('REQ-2025-001', 3, '2025-09-29', 'Daily office operations and documentation requirements'),
('REQ-2025-002', 1, '2025-09-25', 'Restocking retail supplies'),
('REQ-2025-003', 5, '2025-09-23', 'Audit fieldwork supplies');

INSERT INTO Request_Details (request_id, item_id, quantity) VALUES 
(1, 4, 10), (1, 5, 5),
(2, 3, 8),
(3, 1, 5), (3, 2, 2);

-- Insert a Default Admin User (Password: admin123)
INSERT INTO Users (username, password, role) VALUES ('admin', 'admin123', 'SUPERADMIN');
