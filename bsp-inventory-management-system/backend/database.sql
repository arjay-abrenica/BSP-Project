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

-- 3. Create Departments Table (For RSMI Responsibility Centers)
CREATE TABLE Departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL
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
    department_id INT, 
    remarks TEXT,
    FOREIGN KEY (department_id) REFERENCES Departments(department_id)
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

-- 7. Create Users Table (For Login/Authentication)
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, this should be hashed (e.g., bcrypt)
    role VARCHAR(50) DEFAULT 'staff', -- 'admin' or 'staff'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- STEP 2: INSERT SAMPLE DATA
-- =========================================================

INSERT INTO Categories (category_name) VALUES ('Office Supplies'), ('Electrical'), ('Hardware'), ('Medical/Sanitary');
INSERT INTO Suppliers (supplier_name) VALUES ('CHAMPION HARDWARE & CO. Inc.'), ('PS-PhilGEPS');
INSERT INTO Departments (department_name) VALUES ('National Scout Shop'), ('Supply Unit/Admin');

INSERT INTO Items (item_code, item_name, description, unit_of_measure, unit_price, category_id, supplier_id, current_stock) VALUES 
('494', 'FLOURESCENT LAMP (40WATTS) O/T', 'CITY LIGHT', 'pcs', 180.00, 2, 1, 17),
('499', 'LONG NOSE PLIER', 'STANLEY', 'pcs', 320.00, 3, 1, 1),
(NULL, 'Alcohol, 500 ml, 70% Greencross', 'BOTTLE', 'bot', 55.62, 4, 2, 9),
(NULL, 'Bond Paper A4', 'Paramount Paper A4', 'rms', 0.00, 1, NULL, 50),
(NULL, 'Masking Tape 2"', 'Masking Tape', 'roll', 0.00, 1, NULL, 15);

INSERT INTO Transactions (ris_no, transaction_type, transaction_date, department_id, remarks) VALUES 
('24-05-0062', 'OUT', '2024-05-31', 1, 'RSMI May 2024 Issuance');

INSERT INTO Transaction_Details (transaction_id, item_id, quantity, unit_cost) VALUES (1, 4, 2, 0.00), (1, 3, 1, 55.62), (1, 5, 1, 0.00);

-- Insert a Default Admin User (Password: admin123)
INSERT INTO Users (username, password, role) VALUES ('admin', 'admin123', 'admin');