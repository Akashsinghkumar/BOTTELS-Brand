-- AQUAVIORA Cloudflare D1 Database Schema Initialization
-- Execute with: npx wrangler d1 execute bottels-db --file=./schema.sql

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS warehouses;
CREATE TABLE warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    inventory_json TEXT NOT NULL, -- JSON string containing stock per bottle size
    capacity INTEGER DEFAULT 2000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    items_json TEXT NOT NULL, -- JSON string of order items
    total_amount REAL,
    shipping_address_json TEXT NOT NULL,
    assigned_warehouse_id TEXT,
    assigned_warehouse_name TEXT,
    assigned_warehouse_city TEXT,
    delivery_agent TEXT,
    otp TEXT,
    order_status TEXT DEFAULT 'Placed',
    payment_method TEXT DEFAULT 'COD',
    payment_status TEXT DEFAULT 'Pending',
    predicted_eta_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS enquiries;
CREATE TABLE enquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS notification_logs;
CREATE TABLE notification_logs (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Sent',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS support_tickets;
CREATE TABLE support_tickets (
    id TEXT PRIMARY KEY,
    ticket_id TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Admin User & Default Warehouses
INSERT INTO users (id, username, email, password_hash, role) VALUES 
('u1', 'admin', 'admin@aquaviora.com', 'admin123', 'admin'),
('u2', 'manager', 'manager@aquaviora.com', 'manager123', 'warehouse_manager'),
('u3', 'agent', 'agent@aquaviora.com', 'agent123', 'delivery_agent'),
('u4', 'customer', 'customer@aquaviora.com', 'customer123', 'customer');

INSERT INTO warehouses (id, name, city, lat, lng, inventory_json, capacity) VALUES
('w1', 'Patna Central Warehouse', 'Patna', 25.5941, 85.1376, '{"250ml":600,"500ml":450,"600ml":300,"1L":500,"20L":120}', 2000),
('w2', 'Ranchi Hub', 'Ranchi', 23.3441, 85.3096, '{"250ml":300,"500ml":400,"600ml":100,"1L":150,"20L":50}', 1500),
('w3', 'Mumbai Port Warehouse', 'Mumbai', 19.0760, 72.8777, '{"250ml":1200,"500ml":950,"600ml":800,"1L":1000,"20L":400}', 5000),
('w4', 'Kolkata Depot', 'Kolkata', 22.5726, 88.3639, '{"250ml":400,"500ml":300,"600ml":250,"1L":600,"20L":90}', 2000),
('w5', 'Delhi NCR Hub', 'Delhi', 28.6139, 77.2090, '{"250ml":800,"500ml":600,"600ml":500,"1L":850,"20L":200}', 3500);
