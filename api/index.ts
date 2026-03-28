import express from "express";
import "dotenv/config";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Initialize Database
const dbPath = path.join(process.cwd(), "health.db");
const db = new Database(dbPath);

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'patient',
    createdAt TEXT NOT NULL,
    lastLogin TEXT,
    previousLogin TEXT,
    loginCount INTEGER DEFAULT 0,
    age INTEGER,
    sex TEXT,
    mobile TEXT,
    bloodGroup TEXT,
    address TEXT,
    lastActiveTab TEXT DEFAULT 'dashboard'
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userEmail TEXT NOT NULL,
    userName TEXT NOT NULL,
    doctorId TEXT NOT NULL,
    doctorName TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    symptoms TEXT,
    result TEXT NOT NULL,
    confidence REAL NOT NULL,
    type TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS medicines_taken (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    medicineId TEXT NOT NULL,
    medicineName TEXT NOT NULL,
    dosage TEXT NOT NULL,
    takenAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (medicineId) REFERENCES medicines(id)
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    experience TEXT NOT NULL,
    availability TEXT NOT NULL -- JSON string
  );
`);

// Migrations for existing database
try {
  db.exec("ALTER TABLE users ADD COLUMN lastLogin TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN previousLogin TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN loginCount INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN age INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN sex TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN mobile TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN bloodGroup TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN address TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN lastActiveTab TEXT DEFAULT 'dashboard'");
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      userName TEXT NOT NULL,
      doctorId TEXT NOT NULL,
      doctorName TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);
} catch (e) {}

// Seed Medicines if empty
const medicineCount = db.prepare("SELECT COUNT(*) as count FROM medicines").get() as { count: number };
if (medicineCount.count === 0) {
  const seedMedicines = [
    { id: uuidv4(), name: "Paracetamol", category: "Painkiller", description: "Used to treat pain and fever." },
    { id: uuidv4(), name: "Amoxicillin", category: "Antibiotic", description: "Used to treat bacterial infections." },
    { id: uuidv4(), name: "Cetirizine", category: "Antihistamine", description: "Used to treat allergy symptoms." },
    { id: uuidv4(), name: "Metformin", category: "Antidiabetic", description: "Used to treat type 2 diabetes." },
    { id: uuidv4(), name: "Atorvastatin", category: "Statin", description: "Used to lower cholesterol." }
  ];
  const insert = db.prepare("INSERT INTO medicines (id, name, category, description) VALUES (?, ?, ?, ?)");
  for (const m of seedMedicines) {
    insert.run(m.id, m.name, m.category, m.description);
  }
}

// Seed Doctors if empty
const doctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get() as { count: number };
if (doctorCount.count === 0) {
  const seedDoctors = [
    { 
      id: uuidv4(),
      name: 'Dr. Sarah Connor', 
      department: 'Cardiology', 
      experience: '15 Years', 
      availability: JSON.stringify([
        { day: 'Monday', slots: ['09:00', '10:00', '11:00'] },
        { day: 'Wednesday', slots: ['14:00', '15:00', '16:00'] },
        { day: 'Friday', slots: ['09:00', '10:00'] }
      ]) 
    },
    { 
      id: uuidv4(),
      name: 'Dr. James Wilson', 
      department: 'Neurology', 
      experience: '12 Years', 
      availability: JSON.stringify([
        { day: 'Tuesday', slots: ['10:00', '11:00'] },
        { day: 'Thursday', slots: ['14:00', '15:00'] }
      ]) 
    },
    { 
      id: uuidv4(),
      name: 'Dr. Lisa Cuddy', 
      department: 'Dermatology', 
      experience: '10 Years', 
      availability: JSON.stringify([
        { day: 'Monday', slots: ['14:00', '15:00'] },
        { day: 'Tuesday', slots: ['09:00', '10:00'] },
        { day: 'Wednesday', slots: ['11:00', '12:00'] }
      ]) 
    }
  ];
  const insert = db.prepare("INSERT INTO doctors (id, name, department, experience, availability) VALUES (?, ?, ?, ?, ?)");
  for (const d of seedDoctors) {
    insert.run(d.id, d.name, d.department, d.experience, d.availability);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "hackfest-2026-secret-key";

// Email transporter setup
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role, age, sex, mobile, bloodGroup, address } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      
      const insert = db.prepare(`
        INSERT INTO users (id, name, email, password, role, createdAt, age, sex, mobile, bloodGroup, address, lastActiveTab) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(id, name, email, hashedPassword, role || 'patient', createdAt, age, sex, mobile, bloodGroup, address, 'dashboard');
      
      const token = jwt.sign({ id, email, role: role || 'patient' }, JWT_SECRET, { expiresIn: '24h' });
      
      res.status(201).json({ 
        token, 
        user: { id, name, email, role: role || 'patient', createdAt, age, sex, mobile, bloodGroup, address } 
      });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: "Email already exists." });
      }
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(400).json({ error: "Invalid email or password." });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: "Invalid email or password." });

      // Update last login and login count
      const now = new Date().toISOString();
      const previousLogin = user.lastLogin;
      db.prepare("UPDATE users SET previousLogin = ?, lastLogin = ?, loginCount = loginCount + 1 WHERE id = ?").run(previousLogin, now, user.id);
      
      // Get updated user data
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
      const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, JWT_SECRET, { expiresIn: '24h' });
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Profile Routes
  app.get("/api/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found." });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.put("/api/profile", authenticateToken, (req: any, res) => {
    const { name, age, sex, mobile, bloodGroup, address, lastActiveTab } = req.body;
    try {
      const update = db.prepare(`
        UPDATE users 
        SET name = ?, age = ?, sex = ?, mobile = ?, bloodGroup = ?, address = ?, lastActiveTab = ? 
        WHERE id = ?
      `);
      update.run(name, age, sex, mobile, bloodGroup, address, lastActiveTab || 'dashboard', req.user.id);
      res.json({ message: "Profile updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Prediction Routes
  app.get("/api/predictions", authenticateToken, (req: any, res) => {
    const predictions = db.prepare("SELECT * FROM predictions WHERE userId = ? ORDER BY createdAt DESC").all(req.user.id);
    res.json(predictions);
  });

  app.post("/api/predictions", authenticateToken, (req: any, res) => {
    const { symptoms, result, confidence, type } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    try {
      const insert = db.prepare("INSERT INTO predictions (id, userId, symptoms, result, confidence, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
      insert.run(id, req.user.id, symptoms, result, confidence, type, createdAt);
      res.status(201).json({ id, createdAt });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Doctor Routes
  app.get("/api/doctors", authenticateToken, (req, res) => {
    const department = req.query.department as string;
    let rows;
    if (department) {
      rows = db.prepare("SELECT * FROM doctors WHERE department = ?").all(department);
    } else {
      rows = db.prepare("SELECT * FROM doctors").all();
    }
    
    // Parse availability JSON
    const doctors = rows.map((row: any) => ({
      ...row,
      availability: JSON.parse(row.availability)
    }));
    
    res.json(doctors);
  });

  app.post("/api/doctors", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, department, experience, availability } = req.body;
    const id = uuidv4();
    try {
      const insert = db.prepare("INSERT INTO doctors (id, name, department, experience, availability) VALUES (?, ?, ?, ?, ?)");
      insert.run(id, name, department, experience, JSON.stringify(availability));
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.put("/api/doctors/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, department, experience, availability } = req.body;
    try {
      const update = db.prepare("UPDATE doctors SET name = ?, department = ?, experience = ?, availability = ? WHERE id = ?");
      update.run(name, department, experience, JSON.stringify(availability), req.params.id);
      res.json({ message: "Doctor updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.delete("/api/doctors/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare("DELETE FROM doctors WHERE id = ?").run(req.params.id);
      res.json({ message: "Doctor deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Medicine Routes
  app.get("/api/medicines", authenticateToken, (req, res) => {
    const medicines = db.prepare("SELECT * FROM medicines").all();
    res.json(medicines);
  });

  app.post("/api/medicines", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, category, description } = req.body;
    const id = uuidv4();
    try {
      const insert = db.prepare("INSERT INTO medicines (id, name, category, description) VALUES (?, ?, ?, ?)");
      insert.run(id, name, category, description);
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.put("/api/medicines/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { name, category, description } = req.body;
    try {
      const update = db.prepare("UPDATE medicines SET name = ?, category = ?, description = ? WHERE id = ?");
      update.run(name, category, description, req.params.id);
      res.json({ message: "Medicine updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.delete("/api/medicines/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare("DELETE FROM medicines WHERE id = ?").run(req.params.id);
      res.json({ message: "Medicine deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Admin Specific Routes
  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get() as any;
    const visits = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'").get() as any;
    res.json({ users: users.count, visits: visits.count });
  });

  app.get("/api/admin/patients", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const rows = db.prepare("SELECT id, name, email, role, createdAt, lastLogin, loginCount FROM users WHERE role != 'admin'").all();
    res.json(rows);
  });

  app.delete("/api/admin/patients/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ message: "Patient deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.get("/api/admin/appointments", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const rows = db.prepare("SELECT * FROM appointments ORDER BY createdAt DESC").all();
    res.json(rows);
  });

  app.put("/api/admin/appointments/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { status } = req.body;
    try {
      db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ message: "Appointment updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.delete("/api/admin/appointments/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
      res.json({ message: "Appointment deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.get("/api/appointments", authenticateToken, (req: any, res) => {
    try {
      const rows = db.prepare("SELECT * FROM appointments WHERE userId = ? ORDER BY time DESC").all(req.user.id);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.post("/api/appointments", authenticateToken, (req: any, res) => {
    const { doctorId, doctorName, time, status, userEmail, userName } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    try {
      const insert = db.prepare("INSERT INTO appointments (id, userId, userEmail, userName, doctorId, doctorName, time, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insert.run(id, req.user.id, userEmail || req.user.email, userName || req.user.name, doctorId, doctorName, time, status || 'pending', createdAt);
      res.status(201).json({ id, createdAt });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.put("/api/appointments/:id", authenticateToken, (req: any, res) => {
    const { status } = req.body;
    try {
      const update = db.prepare("UPDATE appointments SET status = ? WHERE id = ? AND userId = ?");
      const result = update.run(status, req.params.id, req.user.id);
      if (result.changes === 0) return res.status(404).json({ error: "Not found." });
      res.json({ message: "Appointment updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.get("/api/medicines-taken", authenticateToken, (req: any, res) => {
    const taken = db.prepare("SELECT * FROM medicines_taken WHERE userId = ? ORDER BY takenAt DESC").all(req.user.id);
    res.json(taken);
  });

  app.post("/api/medicines-taken", authenticateToken, (req: any, res) => {
    const { medicineId, medicineName, dosage } = req.body;
    const id = uuidv4();
    const takenAt = new Date().toISOString();
    try {
      const insert = db.prepare("INSERT INTO medicines_taken (id, userId, medicineId, medicineName, dosage, takenAt) VALUES (?, ?, ?, ?, ?, ?)");
      insert.run(id, req.user.id, medicineId, medicineName, dosage, takenAt);
      res.status(201).json({ id, takenAt });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  app.delete("/api/medicines-taken/:id", authenticateToken, (req: any, res) => {
    try {
      const del = db.prepare("DELETE FROM medicines_taken WHERE id = ? AND userId = ?");
      const result = del.run(req.params.id, req.user.id);
      if (result.changes === 0) return res.status(404).json({ error: "Not found." });
      res.json({ message: "Deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Backend is running with SQLite" });
  });

  // Email endpoint
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ success: false, error: "Invalid recipient email address" });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not configured. Email simulation mode.");
      return res.json({ 
        success: true, 
        message: "Email simulation mode active.",
        simulated: true 
      });
    }

    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"HealthApp Support" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  app(req, res);
};
