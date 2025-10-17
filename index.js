const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuration de Nodemailer avec OAuth2 pour Gmail ---
let transporter;

if (process.env.EMAIL_USER && process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET && process.env.OAUTH_REFRESH_TOKEN) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
    });
} else {
    console.warn("⚠️ Attention: Les variables d'environnement pour l'envoi d'e-mails via Gmail (OAuth2) sont manquantes. L'envoi sera désactivé.");
}

// Augmenter la limite de la taille du corps de la requête pour les photos en Base64
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// --- Configuration de la base de données ---
let pool;
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.DATABASE_URL) {
    console.log("Connexion à la base de données via DATABASE_URL...");
    pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 20000,
    });
} else if (!isProduction) {
    console.log("Connexion à la base de données via les variables DB_* (Mode Développement Local)...");
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
} else {
    console.error("❌ ERREUR CRITIQUE: La variable d'environnement DATABASE_URL est manquante en production.");
    process.exit(1);
}

async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Initialisation de la base de données...');
    
     await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, role ENUM('admin', 'parent') NOT NULL, telephone VARCHAR(255));`);
     await connection.query(`CREATE TABLE IF NOT EXISTS students (id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(255) NOT NULL, prenom VARCHAR(255) NOT NULL, dateNaissance DATE NOT NULL, classe VARCHAR(255) NOT NULL, niveauScolaire VARCHAR(255), parentId INT NOT NULL, isArchived BOOLEAN DEFAULT FALSE, photoUrl LONGTEXT, FOREIGN KEY (parentId) REFERENCES users(id) ON DELETE CASCADE);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS teachers (id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(255) NOT NULL, prenom VARCHAR(255) NOT NULL, matiere VARCHAR(255) NOT NULL, telephone VARCHAR(255) NOT NULL, photoUrl LONGTEXT, classes JSON);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS grades (id INT AUTO_INCREMENT PRIMARY KEY, studentId INT NOT NULL, matiere VARCHAR(255) NOT NULL, note FLOAT NOT NULL, coefficient FLOAT NOT NULL, periode VARCHAR(255) NOT NULL, date DATE NOT NULL, FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS attendance (id INT AUTO_INCREMENT PRIMARY KEY, studentId INT NOT NULL, date DATE NOT NULL, statut ENUM('Présent', 'Absent (Non justifié)', 'Absent (Justifié)', 'En retard') NOT NULL, justification TEXT, FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS observations (id INT AUTO_INCREMENT PRIMARY KEY, studentId INT NOT NULL, date DATE NOT NULL, content TEXT NOT NULL, author VARCHAR(255) NOT NULL, FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, senderId INT NOT NULL, receiverId INT NOT NULL, contenu TEXT, date DATETIME NOT NULL, attachmentName VARCHAR(255), attachmentUrl LONGTEXT, FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, userId INT, message TEXT NOT NULL, type ENUM('success', 'error', 'info') NOT NULL, \`read\` BOOLEAN DEFAULT FALSE, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, link VARCHAR(255));`);
     await connection.query(`CREATE TABLE IF NOT EXISTS events (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, event_date DATE NOT NULL);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS documents (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, url LONGTEXT NOT NULL, mimeType VARCHAR(255));`);
     await connection.query(`CREATE TABLE IF NOT EXISTS daily_menus (id INT AUTO_INCREMENT PRIMARY KEY, date DATE NOT NULL UNIQUE, starter VARCHAR(255), mainCourse VARCHAR(255), dessert VARCHAR(255), snack VARCHAR(255), photoUrl LONGTEXT);`);
     await connection.query(`CREATE TABLE IF NOT EXISTS timetable_entries (id INT AUTO_INCREMENT PRIMARY KEY, day VARCHAR(255) NOT NULL, time VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL, teacher VARCHAR(255) NOT NULL, classe VARCHAR(255) NOT NULL);`);

    const [rows] = await connection.query("SELECT * FROM users WHERE role = 'admin'");
    if (rows.length === 0) {
      console.log("Aucun admin trouvé. Création de l'admin par défaut...");
      await connection.query( "INSERT INTO users (nom, email, password, role, telephone) VALUES (?, ?, ?, ?, ?)", ['Admin', 'admin@darennadjah.dz', 'admin', 'admin', '0550123456'] );
    }
    
    console.log('✅ Base de données initialisée.');

  } finally {
      if (connection) connection.release();
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const generateRandomPassword = (length = 8) => { const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; let password = ''; for (let i = 0; i < length; i++) { password += chars.charAt(Math.floor(Math.random() * chars.length)); } return password; };
const addNotification = async (userId, message, type, link) => { try { await pool.execute( 'INSERT INTO notifications (userId, message, type, link, `read`, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [userId ?? null, message, type, link ?? null, false, new Date()] ); } catch (error) { console.error("Erreur lors de l'ajout de la notification:", error); } };

// --- ROUTES API ---

app.post('/api/users/:id/send-password', asyncHandler(async (req, res) => {
    if (!transporter) {
        return res.status(503).json({ message: "Le service d'envoi d'e-mails n'est pas configuré." });
    }
    const { password } = req.body;
    const [rows] = await pool.execute('SELECT nom, email FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    const user = rows[0];

    try {
        await transporter.sendMail({
            from: `"Dar Ennadjah" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Vos identifiants pour Dar Ennadjah',
            html: `<p>Bonjour ${user.nom},</p>
                   <p>Voici vos informations de connexion pour l'application Dar Ennadjah :</p>
                   <ul>
                     <li><strong>Email :</strong> ${user.email}</li>
                     <li><strong>Mot de passe :</strong> ${password}</li>
                   </ul>
                   <p>Cordialement,<br>L'équipe de Dar Ennadjah</p>`
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur d'envoi d'email:", error);
        res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
    }
}));

// Auth
app.post('/api/parent-login', asyncHandler(async (req, res) => { const { email, password } = req.body; const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'parent']); if (rows.length === 0 || rows[0].password !== password) { return res.status(401).json({ message: 'Email ou mot de passe incorrect.' }); } const { password: _, ...user } = rows[0]; res.json(user); }));
app.post('/api/admin-login', asyncHandler(async (req, res) => { const { password } = req.body; const [rows] = await pool.execute("SELECT * FROM users WHERE role = 'admin'"); if (rows.length === 0 || rows[0].password !== password) { return res.status(401).json({ message: 'Mot de passe incorrect.' }); } const { password: _, ...user } = rows[0]; res.json(user); }));
// Users
app.get('/api/users', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT id, nom, email, role, telephone FROM users'); res.json(rows); }));
app.get('/api/users/:id', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT id, nom, email, role, telephone FROM users WHERE id = ?', [req.params.id]); if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' }); res.json(rows[0]); }));
app.get('/api/admin-user', asyncHandler(async (req, res) => { let [rows] = await pool.execute("SELECT id, nom, email, role, telephone FROM users WHERE role = 'admin' LIMIT 1"); if (rows.length === 0) { const [insertResult] = await pool.execute( "INSERT INTO users (nom, email, password, role, telephone) VALUES (?, ?, ?, ?, ?)", ['Admin', 'admin@darennadjah.dz', 'admin', 'admin', '0550123456'] ); [rows] = await pool.execute("SELECT id, nom, email, role, telephone FROM users WHERE id = ?", [insertResult.insertId]); } res.json(rows[0]); }));
app.post('/api/users', asyncHandler(async (req, res) => { const { nom, email, telephone } = req.body; const generatedPassword = generateRandomPassword(); try { const [result] = await pool.execute('INSERT INTO users (nom, email, password, role, telephone) VALUES (?, ?, ?, ?, ?)', [nom, email, generatedPassword, 'parent', telephone ?? null]); res.status(201).json({ id: result.insertId, nom, email, role: 'parent', telephone, generatedPassword }); } catch (error) { if (error.code === 'ER_DUP_ENTRY') { return res.status(409).json({ message: "Cette adresse email est déjà utilisée." }); } throw error; } }));
app.put('/api/users/:id', asyncHandler(async (req, res) => { const { nom, email, telephone } = req.body; await pool.execute('UPDATE users SET nom = ?, email = ?, telephone = ? WHERE id = ?', [nom, email, telephone ?? null, req.params.id]); res.json({ id: parseInt(req.params.id, 10), nom, email, telephone, role: 'parent' }); }));
app.delete('/api/users/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]); res.status(204).send(); }));
app.post('/api/users/:id/reset-password', asyncHandler(async (req, res) => { const newPassword = generateRandomPassword(); await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.params.id]); res.json({ newPassword }); }));
// Students
app.get('/api/students', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM students'); res.json(rows); }));
app.post('/api/students', asyncHandler(async (req, res) => { const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, photoUrl } = req.body; const [result] = await pool.execute( 'INSERT INTO students (nom, prenom, dateNaissance, classe, niveauScolaire, parentId, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?)', [nom, prenom, dateNaissance, classe, niveauScolaire ?? null, parentId, photoUrl ?? null] ); res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/students/:id', asyncHandler(async (req, res) => { const { id } = req.params; const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived, photoUrl } = req.body; await pool.execute( 'UPDATE students SET nom = ?, prenom = ?, dateNaissance = ?, classe = ?, niveauScolaire = ?, parentId = ?, isArchived = ?, photoUrl = ? WHERE id = ?', [nom, prenom, dateNaissance, classe, niveauScolaire ?? null, parentId, isArchived, photoUrl ?? null, id] ); res.json({ id: parseInt(id, 10), ...req.body }); }));
// Teachers
app.get('/api/teachers', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM teachers'); const teachers = rows.map(teacher => ({ ...teacher, classes: teacher.classes ? JSON.parse(teacher.classes) : [] })); res.json(teachers); }));
app.post('/api/teachers', asyncHandler(async (req, res) => { const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body; const [result] = await pool.execute( 'INSERT INTO teachers (nom, prenom, matiere, telephone, photoUrl, classes) VALUES (?, ?, ?, ?, ?, ?)', [nom, prenom, matiere, telephone, photoUrl ?? null, JSON.stringify(classes ?? [])] ); res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/teachers/:id', asyncHandler(async (req, res) => { const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body; await pool.execute( 'UPDATE teachers SET nom = ?, prenom = ?, matiere = ?, telephone = ?, photoUrl = ?, classes = ? WHERE id = ?', [nom, prenom, matiere, telephone, photoUrl ?? null, JSON.stringify(classes ?? []), req.params.id] ); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/teachers/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM teachers WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Grades
app.get('/api/grades', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM grades'); res.json(rows); }));
app.post('/api/grades', asyncHandler(async (req, res) => { const { studentId, matiere, note, coefficient, periode, date } = req.body; const [result] = await pool.execute('INSERT INTO grades (studentId, matiere, note, coefficient, periode, date) VALUES (?, ?, ?, ?, ?, ?)', [studentId, matiere, note, coefficient, periode, date]); const [studentRows] = await pool.execute('SELECT prenom, parentId FROM students WHERE id = ?', [studentId]); if (studentRows.length > 0) { await addNotification(studentRows[0].parentId, `Nouvelle note pour ${studentRows[0].prenom} en ${matiere}: ${note}/20.`, 'info', 'suivi'); } res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/grades/:id', asyncHandler(async (req, res) => { const { studentId, matiere, note, coefficient, periode, date } = req.body; await pool.execute('UPDATE grades SET studentId = ?, matiere = ?, note = ?, coefficient = ?, periode = ?, date = ? WHERE id = ?', [studentId, matiere, note, coefficient, periode, date, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/grades/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM grades WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Attendance
app.get('/api/attendance', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM attendance'); res.json(rows); }));
app.post('/api/attendance', asyncHandler(async (req, res) => { const { studentId, date, statut, justification } = req.body; const [result] = await pool.execute('INSERT INTO attendance (studentId, date, statut, justification) VALUES (?, ?, ?, ?)', [studentId, date, statut, justification ?? null]); const [studentRows] = await pool.execute('SELECT prenom, parentId FROM students WHERE id = ?', [studentId]); const student = studentRows[0]; let absenceThresholdReached = false; if (student) { const isAbsence = statut.includes('Absent'); let message = `Nouveau suivi pour ${student.prenom}: ${statut} le ${new Date(date).toLocaleDateString('fr-FR')}.`; if (isAbsence) { const [absenceRows] = await pool.execute("SELECT COUNT(*) as count FROM attendance WHERE studentId = ? AND statut LIKE 'Absent%'", [studentId]); const absenceCount = absenceRows[0].count; if (absenceCount >= 3) { absenceThresholdReached = true; message = `⚠️ ${student.prenom} a atteint ${absenceCount} absences.`; await addNotification(student.parentId, message, 'error', 'suivi'); } else { await addNotification(student.parentId, message, 'error', 'suivi'); } } else { await addNotification(student.parentId, message, 'info', 'suivi'); } } res.status(201).json({ id: result.insertId, ...req.body, absenceThresholdReached }); }));
app.put('/api/attendance/:id', asyncHandler(async (req, res) => { const { studentId, date, statut, justification } = req.body; await pool.execute('UPDATE attendance SET studentId = ?, date = ?, statut = ?, justification = ? WHERE id = ?', [studentId, date, statut, justification ?? null, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/attendance/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM attendance WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Observations
app.get('/api/observations', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM observations'); res.json(rows); }));
app.post('/api/observations', asyncHandler(async (req, res) => { const { studentId, date, content, author } = req.body; const [result] = await pool.execute('INSERT INTO observations (studentId, date, content, author) VALUES (?, ?, ?, ?)', [studentId, date, content, author]); const [studentRows] = await pool.execute('SELECT prenom, parentId FROM students WHERE id = ?', [studentId]); if (studentRows.length > 0) { await addNotification(studentRows[0].parentId, `Nouvelle observation pour ${studentRows[0].prenom}.`, 'info', 'observations'); } res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/observations/:id', asyncHandler(async (req, res) => { const { studentId, date, content, author } = req.body; await pool.execute('UPDATE observations SET studentId = ?, date = ?, content = ?, author = ? WHERE id = ?', [studentId, date, content, author, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/observations/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM observations WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Timetable
app.get('/api/timetable', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM timetable_entries'); res.json(rows); }));
app.post('/api/timetable', asyncHandler(async (req, res) => { const { classe } = req.query; const entries = req.body; const connection = await pool.getConnection(); try { await connection.beginTransaction(); await connection.execute('DELETE FROM timetable_entries WHERE classe = ?', [classe]); for (const entry of entries) { await connection.execute('INSERT INTO timetable_entries (day, time, subject, teacher, classe) VALUES (?, ?, ?, ?, ?)', [entry.day, entry.time, entry.subject, entry.teacher, classe]); } await connection.commit(); const [rows] = await connection.execute('SELECT * FROM timetable_entries WHERE classe = ?', [classe]); res.status(201).json(rows); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } }));
// Messages
app.get('/api/messages', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM messages ORDER BY date ASC'); res.json(rows); }));
app.post('/api/messages', asyncHandler(async (req, res) => { const { senderId, receiverId, contenu, date, attachmentName, attachmentUrl } = req.body; const [result] = await pool.execute( 'INSERT INTO messages (senderId, receiverId, contenu, date, attachmentName, attachmentUrl) VALUES (?, ?, ?, ?, ?, ?)', [senderId, receiverId, contenu ?? null, date, attachmentName ?? null, attachmentUrl ?? null] ); res.status(201).json({ id: result.insertId, ...req.body }); }));
// Events
app.get('/api/events', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM events ORDER BY event_date DESC'); res.json(rows); }));
app.post('/api/events', asyncHandler(async (req, res) => { const { title, description, event_date } = req.body; const [result] = await pool.execute('INSERT INTO events (title, description, event_date) VALUES (?, ?, ?)', [title, description ?? null, event_date]); res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/events/:id', asyncHandler(async (req, res) => { const { title, description, event_date } = req.body; await pool.execute('UPDATE events SET title = ?, description = ?, event_date = ? WHERE id = ?', [title, description ?? null, event_date, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/events/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Documents
app.get('/api/documents', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM documents'); res.json(rows); }));
app.post('/api/documents', asyncHandler(async (req, res) => { const { title, description, url, mimeType } = req.body; const [result] = await pool.execute('INSERT INTO documents (title, description, url, mimeType) VALUES (?, ?, ?, ?)', [title, description ?? null, url, mimeType ?? null]); res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/documents/:id', asyncHandler(async (req, res) => { const { title, description, url, mimeType } = req.body; await pool.execute('UPDATE documents SET title = ?, description = ?, url = ?, mimeType = ? WHERE id = ?', [title, description ?? null, url, mimeType ?? null, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/documents/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM documents WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Menus
app.get('/api/menus', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM daily_menus'); res.json(rows); }));
app.post('/api/menus', asyncHandler(async (req, res) => { const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body; const [result] = await pool.execute('INSERT INTO daily_menus (date, starter, mainCourse, dessert, snack, photoUrl) VALUES (?, ?, ?, ?, ?, ?)', [date, starter ?? null, mainCourse ?? null, dessert ?? null, snack ?? null, photoUrl ?? null]); res.status(201).json({ id: result.insertId, ...req.body }); }));
app.put('/api/menus/:id', asyncHandler(async (req, res) => { const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body; await pool.execute('UPDATE daily_menus SET date = ?, starter = ?, mainCourse = ?, dessert = ?, snack = ?, photoUrl = ? WHERE id = ?', [date, starter ?? null, mainCourse ?? null, dessert ?? null, snack ?? null, photoUrl ?? null, req.params.id]); res.json({ id: parseInt(req.params.id, 10), ...req.body }); }));
app.delete('/api/menus/:id', asyncHandler(async (req, res) => { await pool.execute('DELETE FROM daily_menus WHERE id = ?', [req.params.id]); res.status(204).send(); }));
// Notifications
app.get('/api/notifications', asyncHandler(async (req, res) => { const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY timestamp DESC'); res.json(rows); }));
app.post('/api/notifications/:id/read', asyncHandler(async (req, res) => { await pool.execute('UPDATE notifications SET `read` = TRUE WHERE id = ?', [req.params.id]); res.json({ success: true }); }));
app.post('/api/notifications/user/:userId/read-all', asyncHandler(async (req, res) => { await pool.execute('UPDATE notifications SET `read` = TRUE WHERE userId = ?', [req.params.userId]); res.json({ success: true }); }));


// Gestionnaire d'erreurs final
app.use((err, req, res, next) => {
    console.error("ERROR STACK:", err.stack);
    res.status(500).json({ message: err.message || 'Une erreur interne est survenue.' });
});

// --- Démarrage du serveur ---
async function startServer() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connexion à la base de données réussie.');
    } catch (error) {
        console.error("❌ Impossible de se connecter à la base de données. Vérifiez vos variables d'environnement.", error);
        process.exit(1);
    }
    
    // Vérification de la connexion email au démarrage
    if (transporter) {
        try {
            await transporter.verify();
            console.log('✅ Connexion au service email (Gmail OAuth2) réussie.');
        } catch (error) {
            console.error("❌ ERREUR CRITIQUE: La vérification de la connexion email a échoué. Le serveur ne peut pas démarrer.");
            console.error("Veuillez vérifier les variables d'environnement OAUTH sur Render.");
            console.error("Erreur originale:", error.message);
            process.exit(1);
        }
    }

    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`✅ Serveur prêt et à l'écoute sur le port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Échec du démarrage du serveur lors de l'initialisation:", error);
        process.exit(1);
    }
}

startServer();