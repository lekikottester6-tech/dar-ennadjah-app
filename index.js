// INSTRUCTIONS:
// 1. Placez ce fichier et `package.json` dans un nouveau dossier `server` à la racine de votre projet.
// 2. Ouvrez un terminal dans le dossier `server`.
// 3. Exécutez `npm install` pour installer les dépendances.
// 4. Assurez-vous que votre variable d'environnement DATABASE_URL sur Render est correcte pour MySQL.
// 5. Exécutez `node index.js` pour démarrer le serveur.
// 6. Votre application frontend devrait maintenant pouvoir communiquer avec votre base de données via ce serveur.

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
// --- CORRECTION CRUCIALE POUR RENDER ---
// Utilise le port assigné par Render, ou 3001 pour le développement local.
const port = process.env.PORT || 3001;

// --- MIDDLEWARE SETUP ---

// 1. Activer CORS pour toutes les requêtes
app.use(cors());

// --- ORDRE STRICT DES MIDDLEWARES ---

// 2. Utilisation des middlewares intégrés d'Express pour parser le JSON et les corps de requêtes URL-encoded.
// NOTE: La limite est augmentée pour accepter les images en Base64.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Middleware anti-cache pour les routes API pour garantir des données fraîches.
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// --- Configuration de la connexion à la base de données ---
// Le serveur utilise maintenant une variable d'environnement sécurisée DATABASE_URL.
// Assurez-vous de la définir dans votre service d'hébergement (ex: Render).
// Format attendu: mysql://USER:PASSWORD@HOST:PORT/DATABASE
const connectionString = process.env.DATABASE_URL;


// --- Configuration de Nodemailer pour l'envoi d'e-mails ---
// Le serveur utilise maintenant des variables d'environnement sécurisées.
// Assurez-vous de définir EMAIL_USER et EMAIL_PASS dans votre service d'hébergement (ex: Render).
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log("✅ Configuration d'e-mail détectée. L'envoi d'e-mails est activé.");
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Variable d'environnement pour l'e-mail
            pass: process.env.EMAIL_PASS  // Variable d'environnement pour le mot de passe d'application
        }
    });
} else {
    console.warn("⚠️ AVERTISSEMENT : Les variables d'environnement EMAIL_USER et EMAIL_PASS ne sont pas définies. L'envoi d'e-mails est DÉSACTIVÉ.");
}


let pool;
let dbInitializationError = null;

async function createDatabaseSchema(connection) {
    console.log("Vérification et création du schéma de la base de données si nécessaire...");

    const createTablesQueries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            role ENUM('admin', 'parent') NOT NULL,
            password VARCHAR(255) NOT NULL,
            telephone VARCHAR(255)
        );`,
        `CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            prenom VARCHAR(255) NOT NULL,
            dateNaissance DATE,
            classe VARCHAR(255),
            niveauScolaire VARCHAR(255),
            parentId INT,
            isArchived BOOLEAN DEFAULT false,
            photoUrl TEXT,
            FOREIGN KEY (parentId) REFERENCES users(id) ON DELETE SET NULL
        );`,
        `CREATE TABLE IF NOT EXISTS teachers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(255) NOT NULL,
            prenom VARCHAR(255) NOT NULL,
            matiere VARCHAR(255),
            telephone VARCHAR(255),
            photoUrl TEXT,
            classes JSON
        );`,
        `CREATE TABLE IF NOT EXISTS grades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            studentId INT NOT NULL,
            matiere VARCHAR(255) NOT NULL,
            note FLOAT NOT NULL,
            coefficient FLOAT NOT NULL,
            periode VARCHAR(255),
            date DATE,
            FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            studentId INT NOT NULL,
            date DATE NOT NULL,
            statut VARCHAR(255) NOT NULL,
            justification TEXT,
            FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS observations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            studentId INT NOT NULL,
            content TEXT NOT NULL,
            date DATE NOT NULL,
            author VARCHAR(255),
            FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS timetable_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day VARCHAR(255) NOT NULL,
            time VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            teacher VARCHAR(255),
            classe VARCHAR(255) NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            senderId INT NOT NULL,
            receiverId INT NOT NULL,
            contenu TEXT,
            date DATETIME NOT NULL,
            attachmentName VARCHAR(255),
            attachmentUrl TEXT,
            FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATE
        );`,
        `CREATE TABLE IF NOT EXISTS documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            url TEXT NOT NULL,
            mimeType VARCHAR(255)
        );`,
        `CREATE TABLE IF NOT EXISTS daily_menus (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            starter TEXT,
            mainCourse TEXT,
            dessert TEXT,
            snack TEXT,
            photoUrl TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50),
            link VARCHAR(255),
            \`read\` BOOLEAN DEFAULT false,
            timestamp DATETIME NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );`
    ];

    try {
        for (const query of createTablesQueries) {
            await connection.query(query);
        }
        console.log("✅ Schéma de la base de données vérifié et à jour.");
    } catch (error) {
        console.error("❌ Erreur critique lors de la création du schéma de la base de données :", error.message);
        throw error;
    }
}

async function initializeDatabase(retries = 3, delay = 5000) {
    if (!connectionString) {
        const message = "❌ FATAL: La variable d'environnement DATABASE_URL n'est pas définie.";
        console.error(message);
        dbInitializationError = new Error(message);
        return null;
    }

    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`Tentative de connexion à la base de données (essai ${i}/${retries})...`);
            const dbUrl = new URL(connectionString);

            const poolConfig = {
                host: dbUrl.hostname,
                user: dbUrl.username,
                password: dbUrl.password,
                database: dbUrl.pathname.slice(1), // remove leading '/'
                port: dbUrl.port || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                connectTimeout: 30000, // Augmenté à 30 secondes
                acquireTimeout: 30000, // Ajouté pour la robustesse
                ssl: {
                    rejectUnauthorized: false 
                }
            };
            
            pool = mysql.createPool(poolConfig);
            const connection = await pool.getConnection();
            console.log("✅ Connexion à la base de données MySQL réussie !");

            // S'assurer que le schéma de la base de données existe
            await createDatabaseSchema(connection);

            // Vérification et création de l'admin par défaut
            try {
                const [admins] = await connection.query("SELECT id FROM users WHERE role = 'admin'");
                if (admins.length === 0) {
                    console.warn("⚠️ Aucun compte administrateur trouvé. Création d'un compte admin par défaut...");
                    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin';
                    await connection.query(
                        'INSERT INTO users (nom, email, role, password, telephone) VALUES (?, ?, ?, ?, ?)',
                        ['Admin', 'admin@darennadjah.dz', 'admin', defaultAdminPassword, '0550000000']
                    );
                    console.log(`✅ Compte administrateur par défaut créé. Email: admin@darennadjah.dz, Mot de passe: ${defaultAdminPassword}`);
                }
            } catch (adminCheckError) {
                console.error("❌ Erreur lors de la vérification/création du compte admin :", adminCheckError.message);
            }
            
            connection.release();
            dbInitializationError = null;
            return pool;

        } catch (error) {
            console.error(`❌ Essai ${i} échoué: Impossible de se connecter à la base de données.`);
            console.error("Détails de l'erreur:", error.message);
            dbInitializationError = error;
            
            if (pool) {
                await pool.end().catch(err => console.error("Erreur lors de la fermeture du pool échoué:", err));
                pool = null;
            }

            if (i < retries) {
                console.log(`Nouvelle tentative dans ${delay / 1000} secondes...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    console.error("❌ FATAL: Toutes les tentatives de connexion à la base de données ont échoué.");
    return null;
}

const dbPoolPromise = initializeDatabase();

async function getDbPool() {
    const pool = await dbPoolPromise;
    if (!pool || dbInitializationError) {
        throw new Error("La base de données n'est pas connectée. Vérifiez les logs du serveur pour les détails.");
    }
    return pool;
}

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error("--- ERREUR API NON GÉRÉE ---");
        console.error(err);
        const errorMessage = (err && err.message) ? err.message : 'Une erreur interne du serveur est survenue.';
        res.status(500).json({ message: errorMessage, error: err });
    });

const generateRandomPassword = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// --- Point de terminaison de statut (pour le diagnostic) ---
app.get('/api/status', async (req, res) => {
    if (dbInitializationError) {
        return res.status(500).json({
            status: 'error',
            message: 'Impossible de se connecter à la base de données.',
            error: dbInitializationError.message,
        });
    }
    try {
        const db = await getDbPool();
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            message: 'Le serveur est en cours d\'exécution et connecté avec succès à la base de données.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Le serveur est en cours d\'exécution, mais n\'a pas pu exécuter de requête.',
            error: error.message,
        });
    }
});

// --- API Endpoints ---

const getAll = (tableName) => asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);
    res.json(rows);
});

const deleteById = (tableName) => asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
    res.status(204).send();
});

// AUTHENTICATION
app.post('/api/parent-login', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }
    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'parent'", [email]);
    if (users.length === 0 || users[0].password !== password) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    const { password: userPassword, ...userWithoutPassword } = users[0];
    res.json(userWithoutPassword);
}));

app.post('/api/admin-login', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Le mot de passe est requis.' });
    }
    const [users] = await db.query("SELECT * FROM users WHERE role = 'admin'");
    if (users.length === 0) {
        return res.status(404).json({ message: 'Aucun compte administrateur trouvé.' });
    }
    const adminUser = users[0];
    if (adminUser.password !== password) {
        return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }
    const { password: userPassword, ...userWithoutPassword } = adminUser;
    res.json(userWithoutPassword);
}));

// USERS
app.get('/api/users', getAll('users'));
app.get('/api/users/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const [users] = await db.query("SELECT id, nom, email, role, telephone FROM users WHERE id = ?", [id]);
    if (users.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json(users[0]);
}));
app.get('/api/admin-user', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const [users] = await db.query("SELECT id, nom, email, role FROM users WHERE role = 'admin' LIMIT 1");
    if (users.length === 0) {
        return res.status(404).json({ message: "Aucun utilisateur admin n'a été trouvé." });
    }
    res.json(users[0]);
}));
app.post('/api/users', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, email, role, telephone } = req.body;
    const generatedPassword = generateRandomPassword();
    const [result] = await db.query('INSERT INTO users (nom, email, role, telephone, password) VALUES (?, ?, ?, ?, ?)', [nom, email, role, telephone, generatedPassword]);
    res.status(201).json({ id: result.insertId, ...req.body, generatedPassword });
}));
app.put('/api/users/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { nom, email, role, telephone } = req.body;
    await db.query('UPDATE users SET nom = ?, email = ?, role = ?, telephone = ? WHERE id = ?', [nom, email, role, telephone, id]);
    res.json({ id, ...req.body });
}));
app.post('/api/users/:id/reset-password', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const newPassword = generateRandomPassword();
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);
    res.json({ newPassword });
}));
app.post('/api/users/:id/send-password', asyncHandler(async (req, res) => {
    if (!transporter) {
        return res.status(503).json({ message: "Le service d'envoi d'e-mails n'est pas configuré sur le serveur." });
    }
    const db = await getDbPool();
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Le mot de passe est requis.' });
    const [users] = await db.query('SELECT email, nom FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ message: 'Parent non trouvé.' });
    const parent = users[0];
    const mailOptions = { 
        from: `"Dar Ennadjah" <${process.env.EMAIL_USER}>`, 
        to: parent.email, 
        subject: 'Vos identifiants de connexion pour Dar Ennadjah', 
        html: `
            <p>Bonjour ${parent.nom},</p>
            <p>Voici vos informations de connexion pour l'application Dar Ennadjah :</p>
            <ul>
                <li><strong>Email :</strong> ${parent.email}</li>
                <li><strong>Mot de passe :</strong> ${password}</li>
            </ul>
            <p>Cordialement,<br>L'équipe de Dar Ennadjah</p>
        ` 
    };
    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: `Email envoyé avec succès à ${parent.email}` });
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        res.status(500).json({ message: "Échec de l'envoi de l'email. Vérifiez la configuration du serveur.", error: error.message });
    }
}));
app.delete('/api/users/:id', deleteById('users'));

// STUDENTS - CORRIGÉ
app.get('/api/students', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const [rows] = await db.query('SELECT * FROM `students`');
    // S'assure que `isArchived` est un booléen pour éviter les problèmes de type
    const students = rows.map(s => ({
        ...s,
        isArchived: Boolean(s.isArchived)
    }));
    res.json(students);
}));
app.post('/api/students', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived = false, photoUrl } = req.body;
    const [result] = await db.query('INSERT INTO students (nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [nom, prenom, dateNaissance, classe, niveauScolaire || null, parentId, isArchived, photoUrl]);
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const db = await getDbPool();
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived, photoUrl } = req.body;
    await db.query('UPDATE students SET nom = ?, prenom = ?, dateNaissance = ?, classe = ?, niveauScolaire = ?, parentId = ?, isArchived = ?, photoUrl = ? WHERE id = ?', [nom, prenom, dateNaissance, classe, niveauScolaire || null, parentId, isArchived, photoUrl, id]);
    res.json({ id, ...req.body });
}));

// TEACHERS
app.get('/api/teachers', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const [rows] = await db.query('SELECT * FROM teachers');
    res.json(rows.map(t => ({ ...t, classes: t.classes || [] })));
}));
app.post('/api/teachers', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    const [result] = await db.query('INSERT INTO teachers (nom, prenom, matiere, telephone, photoUrl, classes) VALUES (?, ?, ?, ?, ?, ?)', [nom, prenom, matiere, telephone, photoUrl, JSON.stringify(classes || [])]);
    res.status(201).json({ id: result.insertId, ...req.body, classes: classes || [] });
}));
app.put('/api/teachers/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    await db.query('UPDATE teachers SET nom = ?, prenom = ?, matiere = ?, telephone = ?, photoUrl = ?, classes = ? WHERE id = ?', [nom, prenom, matiere, telephone, photoUrl, JSON.stringify(classes || []), id]);
    res.json({ id, ...req.body, classes: classes || [] });
}));
app.delete('/api/teachers/:id', deleteById('teachers'));

// NOTIFICATION HELPER
const addNotification = async (queryable, { userId, message, type, link }) => {
    await queryable.query('INSERT INTO notifications (userId, message, type, link, `read`, timestamp) VALUES (?, ?, ?, ?, false, NOW())', [userId, message, type, link]);
};

// GRADES, ATTENDANCE, OBSERVATIONS...
app.get('/api/grades', getAll('grades'));
app.post('/api/grades', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    const [result] = await db.query('INSERT INTO grades (studentId, matiere, note, coefficient, periode, date) VALUES (?, ?, ?, ?, ?, ?)', [studentId, matiere, note, coefficient, periode, date]);
    const [[student]] = await db.query('SELECT parentId, prenom FROM students WHERE id = ?', [studentId]);
    if (student) addNotification(db, { userId: student.parentId, message: `Nouvelle note en ${matiere} pour ${student.prenom}: ${note}/20.`, type: 'info', link: 'suivi' });
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/grades/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    await db.query('UPDATE grades SET studentId = ?, matiere = ?, note = ?, coefficient = ?, periode = ?, date = ? WHERE id = ?', [studentId, matiere, note, coefficient, periode, date, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/grades/:id', deleteById('grades'));

app.get('/api/attendance', getAll('attendance'));
app.post('/api/attendance', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, date, statut, justification } = req.body;
    const [result] = await db.query('INSERT INTO attendance (studentId, date, statut, justification) VALUES (?, ?, ?, ?)', [studentId, date, statut, justification]);
    const [[student]] = await db.query('SELECT parentId, prenom FROM students WHERE id = ?', [studentId]);
    if (student) addNotification(db, { userId: student.parentId, message: `Nouveau suivi pour ${student.prenom}: ${statut} le ${new Date(date).toLocaleDateString('fr-FR')}.`, type: statut.includes('Absent') ? 'error' : 'info', link: 'suivi' });
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/attendance/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, date, statut, justification } = req.body;
    await db.query('UPDATE attendance SET studentId = ?, date = ?, statut = ?, justification = ? WHERE id = ?', [studentId, date, statut, justification, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/attendance/:id', deleteById('attendance'));

app.get('/api/observations', getAll('observations'));
app.post('/api/observations', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, content, date, author } = req.body;
    const [result] = await db.query('INSERT INTO observations (studentId, content, date, author) VALUES (?, ?, ?, ?)', [studentId, content, date, author || 'Administration']);
    const [[student]] = await db.query('SELECT parentId, prenom FROM students WHERE id = ?', [studentId]);
    if (student) addNotification(db, { userId: student.parentId, message: `Nouvelle observation pour ${student.prenom}.`, type: 'info', link: 'observations' });
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/observations/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, content, date, author } = req.body;
    await db.query('UPDATE observations SET studentId = ?, content = ?, date = ?, author = ? WHERE id = ?', [studentId, content, date, author || 'Administration', id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/observations/:id', deleteById('observations'));

// TIMETABLE
app.post('/api/timetable', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { classe } = req.query;
    if (!classe) return res.status(400).json({ message: 'La classe est requise.' });
    const client = await db.getConnection();
    try {
        await client.beginTransaction();
        await client.query('DELETE FROM timetable_entries WHERE LOWER(classe) = LOWER(?)', [classe]);
        for (const entry of req.body) {
            await client.query('INSERT INTO timetable_entries (day, time, subject, teacher, classe) VALUES (?, ?, ?, ?, ?)', [entry.day, entry.time, entry.subject, entry.teacher, classe]);
        }
        
        const [studentsInClass] = await client.query('SELECT parentId FROM students WHERE LOWER(classe) = LOWER(?)', [classe]);
        const parentIds = [...new Set(studentsInClass.map(s => s.parentId))];
        
        for (const parentId of parentIds) {
            if (parentId) {
                await addNotification(client, { 
                    userId: parentId, 
                    message: `L'emploi du temps pour la classe ${classe} a été mis à jour.`, 
                    type: 'info', 
                    link: 'suivi' 
                });
            }
        }
        await client.commit();
        const [updatedRows] = await client.query('SELECT * FROM timetable_entries WHERE LOWER(classe) = LOWER(?)', [classe]);
        res.status(201).json(updatedRows);
    } catch (err) {
        await client.rollback(); throw err;
    } finally {
        client.release();
    }
}));
app.get('/api/timetable', getAll('timetable_entries'));

// MESSAGES (FINAL ROBUST VERSION)
app.post('/api/messages', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { senderId, receiverId, contenu, date, attachmentName, attachmentUrl } = req.body;

    const numSenderId = Number(senderId);
    if (!Number.isInteger(numSenderId) || numSenderId <= 0) {
        return res.status(400).json({ message: `ID de l'expéditeur invalide. Reçu: '${senderId}'.` });
    }
    const numReceiverId = Number(receiverId);
    if (!Number.isInteger(numReceiverId) || numReceiverId <= 0) {
        return res.status(400).json({ message: `ID du destinataire invalide. Reçu: '${receiverId}'.` });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [senders] = await connection.query('SELECT id, nom FROM users WHERE id = ?', [numSenderId]);
        if (senders.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Action impossible : l'expéditeur (ID ${numSenderId}) n'existe pas. Veuillez vous reconnecter.` });
        }
        const [receivers] = await connection.query('SELECT id FROM users WHERE id = ?', [numReceiverId]);
        if (receivers.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Action impossible : le destinataire (ID ${numReceiverId}) n'existe pas.` });
        }
        
        const [result] = await connection.query(
            'INSERT INTO messages (senderId, receiverId, contenu, date, attachmentName, attachmentUrl) VALUES (?, ?, ?, ?, ?, ?)',
            [numSenderId, numReceiverId, contenu || null, date, attachmentName || null, attachmentUrl || null]
        );

        await addNotification(connection, {
            userId: numReceiverId,
            message: `Nouveau message de ${senders[0].nom}.`,
            type: 'info',
            link: 'messages'
        });
        
        await connection.commit();

        const [[newMessage]] = await connection.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
        res.status(201).json(newMessage);

    } catch (error) {
        await connection.rollback();
        console.error("[MESSAGES] ERREUR:", error);
        res.status(500).json({ message: `Échec de l'envoi du message : ${error.message}` });
    } finally {
        connection.release();
    }
}));
app.get('/api/messages', getAll('messages'));

// EVENTS
app.get('/api/events', getAll('events'));
app.post('/api/events', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { title, description, event_date } = req.body;
    const [result] = await db.query('INSERT INTO events (title, description, event_date) VALUES (?, ?, ?)', [title, description, event_date]);
    const [parents] = await db.query("SELECT id FROM users WHERE role = 'parent'");
    for (const parent of parents) addNotification(db, { userId: parent.id, message: `Nouvel événement : "${title}" le ${new Date(event_date).toLocaleDateString('fr-FR')}.`, type: 'info', link: 'evenements' });
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/events/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { title, description, event_date } = req.body;
    await db.query('UPDATE events SET title = ?, description = ?, event_date = ? WHERE id = ?', [title, description, event_date, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/events/:id', deleteById('events'));

// DOCUMENTS
app.get('/api/documents', getAll('documents'));
app.post('/api/documents', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { title, description, url, mimeType } = req.body;
    const [result] = await db.query('INSERT INTO documents (title, description, url, mimeType) VALUES (?, ?, ?, ?)', [title, description, url, mimeType]);
    const [parents] = await db.query("SELECT id FROM users WHERE role = 'parent'");
    for (const parent of parents) addNotification(db, { userId: parent.id, message: `Nouveau document disponible : "${title}".`, type: 'info', link: 'documents' });
    res.status(201).json({ id: result.insertId, ...req.body });
}));
app.put('/api/documents/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { title, description, url, mimeType } = req.body;
    await db.query('UPDATE documents SET title = ?, description = ?, url = ?, mimeType = ? WHERE id = ?', [title, description, url, mimeType, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/documents/:id', deleteById('documents'));

// MENUS
app.get('/api/menus', getAll('daily_menus'));
app.post('/api/menus', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    
    const [existing] = await db.query('SELECT id FROM daily_menus WHERE date = ? LIMIT 1', [date]);

    if (existing.length > 0) {
        const existingId = existing[0].id;
        await db.query('UPDATE daily_menus SET starter = ?, mainCourse = ?, dessert = ?, snack = ?, photoUrl = ? WHERE id = ?', [starter, mainCourse, dessert, snack, photoUrl || null, existingId]);
        const [[updatedRow]] = await db.query('SELECT * FROM daily_menus WHERE id = ?', [existingId]);
        res.status(200).json(updatedRow);
    } else {
        const [result] = await db.query('INSERT INTO daily_menus (date, starter, mainCourse, dessert, snack, photoUrl) VALUES (?, ?, ?, ?, ?, ?)', [date, starter, mainCourse, dessert, snack, photoUrl || null]);
        
        const menuDate = new Date(date);
        const dayOfWeek = menuDate.getUTCDay();
        const diff = menuDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeekStr = new Date(menuDate.setUTCDate(diff)).toISOString().split('T')[0];

        const [existingNotifications] = await db.query("SELECT id FROM notifications WHERE message = ? AND timestamp >= ?", ['Le menu de la semaine est disponible.', startOfWeekStr]);
        if (existingNotifications.length === 0) {
            const [parents] = await db.query("SELECT id FROM users WHERE role = 'parent'");
            for (const parent of parents) {
                addNotification(db, { userId: parent.id, message: 'Le menu de la semaine est disponible.', type: 'info', link: 'cantine' });
            }
        }
        
        const [[newMenu]] = await db.query('SELECT * FROM daily_menus WHERE id = ?', [result.insertId]);
        res.status(201).json(newMenu);
    }
}));
app.put('/api/menus/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    const [existing] = await db.query('SELECT id FROM daily_menus WHERE date = ? AND id != ?', [date, id]);
    if (existing.length > 0) return res.status(409).json({ message: `Un menu existe déjà pour la date ${new Date(date).toLocaleDateString('fr-FR')}.` });
    await db.query('UPDATE daily_menus SET date = ?, starter = ?, mainCourse = ?, dessert = ?, snack = ?, photoUrl = ? WHERE id = ?', [date, starter, mainCourse, dessert, snack, photoUrl || null, id]);
    const [[updatedRow]] = await db.query('SELECT * FROM daily_menus WHERE id = ?', [id]);
    if (!updatedRow) {
        return res.status(404).json({ message: 'Menu non trouvé après la mise à jour.' });
    }
    res.json(updatedRow);
}));
app.delete('/api/menus/:id', deleteById('daily_menus'));

// NOTIFICATIONS
app.get('/api/notifications', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const [rows] = await db.query('SELECT * FROM notifications ORDER BY timestamp DESC');
    res.json(rows);
}));
app.post('/api/notifications/:id/read', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    await db.query('UPDATE notifications SET `read` = true WHERE id = ?', [req.params.id]);
    res.json({ success: true });
}));
app.post('/api/notifications/user/:userId/read-all', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    await db.query('UPDATE notifications SET `read` = true WHERE userId = ?', [req.params.userId]);
    res.json({ success: true });
}));

// --- Gestionnaire d'erreurs final ---
app.use((err, req, res, next) => {
    console.error("Erreur finale non gérée:", err);
    res.status(500).send('Quelque chose s\'est mal passé !');
});

// Start server
app.listen(port, () => {
    console.log(`Le serveur backend pour Dar Ennadjah est en cours d'exécution sur le port ${port}`);
    if (port === 3001) { // Affiche le message localhost uniquement en développement local
        console.log(`Visitez http://localhost:${port}/api/status pour vérifier la connexion à la base de données.`);
    }
});