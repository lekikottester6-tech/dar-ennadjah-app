// INSTRUCTIONS:
// 1. Placez ce fichier et `package.json` dans un nouveau dossier `server` à la racine de votre projet.
// 2. Ouvrez un terminal dans le dossier `server`.
// 3. Exécutez `npm install` pour installer les dépendances.
// 4. MODIFIEZ les informations de connexion à la base de données ci-dessous (host, user, password, database).
// 5. Exécutez `node index.js` pour démarrer le serveur.
// 6. Votre application frontend devrait maintenant pouvoir communiquer avec votre base de données via ce serveur.

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// --- MIDDLEWARE SETUP ---

// 1. Activer CORS pour toutes les requêtes
app.use(cors());

// 2. Configuration de Multer pour le téléversement de fichiers
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limite la taille des fichiers à 10MB
});

// --- ORDRE STRICT DES MIDDLEWARES ---

// 3. La route de téléversement est prioritaire pour être gérée par Multer AVANT les parsers de corps JSON.
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        console.error("Téléversement échoué : req.file est indéfini. Vérifiez que le nom du champ côté client est 'photo'.");
        return res.status(400).json({ message: 'Aucun fichier fourni ou le nom du champ est incorrect.' });
    }
    
    console.log(`✅ Fichier téléchargé avec succès : ${req.file.filename}`);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ photoUrl: fileUrl });
});

// 4. Servir les fichiers téléversés de manière statique.
app.use('/uploads', express.static(UPLOADS_DIR));

// 5. Utilisation des middlewares intégrés d'Express pour parser le JSON et les corps de requêtes URL-encoded.
// C'est la méthode moderne recommandée, remplaçant `body-parser`.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Middleware anti-cache pour les routes API pour garantir des données fraîches.
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// --- Configuration de la connexion à la base de données ---
// !!! VEUILLEZ METTRE À JOUR CES INFORMATIONS POUR VOTRE BASE DE DONNÉES POSTGRESQL !!!
const dbConfig = {
    host: 'aws-1-eu-north-1.pooler.supabase.com',
    user: 'postgres.rhufozmdwtnsbqrqtyiu',
    password: '3yvCfHKYDfrE7L8r',
    database: 'postgres',
    port: 6543,
};

// --- Configuration de Nodemailer pour l'envoi d'e-mails ---
// !!! VEUILLEZ REMPLACER PAR VOS VRAIES INFORMATIONS !!!
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'votre.email@gmail.com',
        pass: 'votre_mot_de_passe_application'
    }
});

let pool;
let dbInitializationError = null;

async function initializeDatabase() {
    try {
        console.log("Tentative de connexion à la base de données PostgreSQL...");
        pool = new Pool(dbConfig);
        const client = await pool.connect();
        console.log("✅ Connexion à la base de données PostgreSQL réussie !");
        client.release();
        return pool;
    } catch (error) {
        console.error("❌ FATAL: Impossible de se connecter à la base de données PostgreSQL.");
        console.error("Veuillez vérifier votre configuration 'dbConfig' dans le fichier server/index.js.");
        console.error("Détails de l'erreur:", error.message);
        dbInitializationError = error;
        return null;
    }
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
        if (err instanceof multer.MulterError) {
            console.error("Erreur Multer détectée:", err);
            return res.status(400).json({ message: `Erreur de téléversement: ${err.message}` });
        }
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
    const { rows } = await db.query(`SELECT * FROM "${tableName}"`);
    res.json(rows);
});

const deleteById = (tableName) => asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    await db.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
    res.status(204).send();
});

// AUTHENTICATION
app.post('/api/parent-login', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }
    const { rows: users } = await db.query("SELECT * FROM users WHERE email = $1 AND role = 'parent'", [email]);
    if (users.length === 0 || users[0].password !== password) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    const { password: userPassword, ...userWithoutPassword } = users[0];
    res.json(userWithoutPassword);
}));

// USERS
app.get('/api/users', getAll('users'));
app.post('/api/users', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, email, role, telephone } = req.body;
    const generatedPassword = generateRandomPassword();
    const { rows } = await db.query('INSERT INTO users (nom, email, role, telephone, password) VALUES ($1, $2, $3, $4, $5) RETURNING id', [nom, email, role, telephone, generatedPassword]);
    res.status(201).json({ id: rows[0].id, ...req.body, generatedPassword });
}));
app.put('/api/users/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { nom, email, role, telephone } = req.body;
    await db.query('UPDATE users SET nom = $1, email = $2, role = $3, telephone = $4 WHERE id = $5', [nom, email, role, telephone, id]);
    res.json({ id, ...req.body });
}));
app.post('/api/users/:id/reset-password', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const newPassword = generateRandomPassword();
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, id]);
    res.json({ newPassword });
}));
app.post('/api/users/:id/send-password', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Le mot de passe est requis.' });
    const { rows: users } = await db.query('SELECT email, nom FROM users WHERE id = $1', [id]);
    if (users.length === 0) return res.status(404).json({ message: 'Parent non trouvé.' });
    const parent = users[0];
    const mailOptions = { from: `"Dar Ennadjah" <${transporter.options.auth.user}>`, to: parent.email, subject: 'Vos identifiants de connexion pour Dar Ennadjah', html: `...` };
    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: `Email envoyé avec succès à ${parent.email}` });
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        res.status(500).json({ message: "Échec de l'envoi de l'email. Vérifiez la configuration du serveur.", error: error.message });
    }
}));
app.delete('/api/users/:id', deleteById('users'));

// STUDENTS
app.get('/api/students', getAll('students'));
app.post('/api/students', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived = false, photoUrl } = req.body;
    const { rows } = await db.query('INSERT INTO students (nom, prenom, "dateNaissance", classe, "niveauScolaire", "parentId", "isArchived", "photoUrl") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [nom, prenom, dateNaissance, classe, niveauScolaire || null, parentId, isArchived, photoUrl]);
    res.status(201).json({ id: rows[0].id, ...req.body });
}));
app.put('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const db = await getDbPool();
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived, photoUrl } = req.body;
    await db.query('UPDATE students SET nom = $1, prenom = $2, "dateNaissance" = $3, classe = $4, "niveauScolaire" = $5, "parentId" = $6, "isArchived" = $7, "photoUrl" = $8 WHERE id = $9', [nom, prenom, dateNaissance, classe, niveauScolaire || null, parentId, isArchived, photoUrl, id]);
    res.json({ id, ...req.body });
}));

// TEACHERS
app.get('/api/teachers', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { rows } = await db.query('SELECT * FROM teachers');
    res.json(rows.map(t => ({ ...t, classes: t.classes || [] })));
}));
app.post('/api/teachers', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO teachers (nom, prenom, matiere, telephone, "photoUrl", classes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [nom, prenom, matiere, telephone, photoUrl, JSON.stringify(classes || [])]);
    res.status(201).json({ id: resultRows[0].id, ...req.body, classes: classes || [] });
}));
app.put('/api/teachers/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    await db.query('UPDATE teachers SET nom = $1, prenom = $2, matiere = $3, telephone = $4, "photoUrl" = $5, classes = $6 WHERE id = $7', [nom, prenom, matiere, telephone, photoUrl, JSON.stringify(classes || []), id]);
    res.json({ id, ...req.body, classes: classes || [] });
}));
app.delete('/api/teachers/:id', deleteById('teachers'));

// NOTIFICATION HELPER
const addNotification = async (queryable, { userId, message, type, link }) => {
    await queryable.query('INSERT INTO notifications ("userId", message, type, link, "read", timestamp) VALUES ($1, $2, $3, $4, false, NOW())', [userId, message, type, link]);
};

// GRADES, ATTENDANCE, OBSERVATIONS... (These endpoints seem correct)
app.get('/api/grades', getAll('grades'));
app.post('/api/grades', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO grades ("studentId", matiere, note, coefficient, periode, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [studentId, matiere, note, coefficient, periode, date]);
    const { rows: students } = await db.query('SELECT "parentId", prenom FROM students WHERE id = $1', [studentId]);
    if (students.length > 0) addNotification(db, { userId: students[0].parentId, message: `Nouvelle note en ${matiere} pour ${students[0].prenom}: ${note}/20.`, type: 'info', link: 'suivi' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));
app.put('/api/grades/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    await db.query('UPDATE grades SET "studentId" = $1, matiere = $2, note = $3, coefficient = $4, periode = $5, date = $6 WHERE id = $7', [studentId, matiere, note, coefficient, periode, date, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/grades/:id', deleteById('grades'));

app.get('/api/attendance', getAll('attendance'));
app.post('/api/attendance', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, date, statut, justification } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO attendance ("studentId", date, statut, justification) VALUES ($1, $2, $3, $4) RETURNING id', [studentId, date, statut, justification]);
    const { rows: students } = await db.query('SELECT "parentId", prenom FROM students WHERE id = $1', [studentId]);
    if (students.length > 0) addNotification(db, { userId: students[0].parentId, message: `Nouveau suivi pour ${students[0].prenom}: ${statut} le ${new Date(date).toLocaleDateString('fr-FR')}.`, type: statut.includes('Absent') ? 'error' : 'info', link: 'suivi' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));
app.put('/api/attendance/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, date, statut, justification } = req.body;
    await db.query('UPDATE attendance SET "studentId" = $1, date = $2, statut = $3, justification = $4 WHERE id = $5', [studentId, date, statut, justification, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/attendance/:id', deleteById('attendance'));

app.get('/api/observations', getAll('observations'));
app.post('/api/observations', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { studentId, content, date, author } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO observations ("studentId", content, date, author) VALUES ($1, $2, $3, $4) RETURNING id', [studentId, content, date, author || 'Administration']);
    const { rows: students } = await db.query('SELECT "parentId", prenom FROM students WHERE id = $1', [studentId]);
    if (students.length > 0) addNotification(db, { userId: students[0].parentId, message: `Nouvelle observation pour ${students[0].prenom}.`, type: 'info', link: 'observations' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));
app.put('/api/observations/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { studentId, content, date, author } = req.body;
    await db.query('UPDATE observations SET "studentId" = $1, content = $2, date = $3, author = $4 WHERE id = $5', [studentId, content, date, author || 'Administration', id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/observations/:id', deleteById('observations'));

// TIMETABLE
app.get('/api/timetable', getAll('timetable_entries'));
app.post('/api/timetable', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { classe } = req.query;
    if (!classe) return res.status(400).json({ message: 'La classe est requise.' });
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM timetable_entries WHERE LOWER(classe) = LOWER($1)', [classe]);
        for (const entry of req.body) {
            await client.query('INSERT INTO timetable_entries (day, time, subject, teacher, classe) VALUES ($1, $2, $3, $4, $5)', [entry.day, entry.time, entry.subject, entry.teacher, classe]);
        }
        await client.query('COMMIT');
        const { rows: studentsInClass } = await client.query('SELECT "parentId" FROM students WHERE LOWER(classe) = LOWER($1)', [classe]);
        for (const parentId of [...new Set(studentsInClass.map(s => s.parentId))]) {
            if (parentId) await addNotification(client, { userId: parentId, message: `L'emploi du temps pour la classe ${classe} a été mis à jour.`, type: 'info', link: 'suivi' });
        }
        const { rows: updatedRows } = await client.query('SELECT * FROM timetable_entries WHERE LOWER(classe) = LOWER($1)', [classe]);
        res.status(201).json(updatedRows);
    } catch (err) {
        await client.query('ROLLBACK'); throw err;
    } finally {
        client.release();
    }
}));

// MESSAGES
app.get('/api/messages', getAll('messages'));
app.post('/api/messages', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { senderId, receiverId, contenu, date, attachmentName, attachmentUrl } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO messages ("senderId", "receiverId", contenu, date, "attachmentName", "attachmentUrl") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [senderId, receiverId, contenu, date, attachmentName, attachmentUrl]);
    const { rows: senders } = await db.query('SELECT nom FROM users WHERE id = $1', [senderId]);
    if (senders.length > 0) addNotification(db, { userId: receiverId, message: `Nouveau message de ${senders[0].nom}.`, type: 'info', link: 'messages' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));

// EVENTS
app.get('/api/events', getAll('events'));
app.post('/api/events', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { title, description, event_date } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO events (title, description, event_date) VALUES ($1, $2, $3) RETURNING id', [title, description, event_date]);
    const { rows: parents } = await db.query("SELECT id FROM users WHERE role = 'parent'");
    for (const parent of parents) addNotification(db, { userId: parent.id, message: `Nouvel événement : "${title}" le ${new Date(event_date).toLocaleDateString('fr-FR')}.`, type: 'info', link: 'evenements' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));
app.put('/api/events/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { title, description, event_date } = req.body;
    await db.query('UPDATE events SET title = $1, description = $2, event_date = $3 WHERE id = $4', [title, description, event_date, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/events/:id', deleteById('events'));

// DOCUMENTS
app.get('/api/documents', getAll('documents'));
app.post('/api/documents', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { title, description, url } = req.body;
    const { rows: resultRows } = await db.query('INSERT INTO documents (title, description, url) VALUES ($1, $2, $3) RETURNING id', [title, description, url]);
    const { rows: parents } = await db.query("SELECT id FROM users WHERE role = 'parent'");
    for (const parent of parents) addNotification(db, { userId: parent.id, message: `Nouveau document disponible : "${title}".`, type: 'info', link: 'documents' });
    res.status(201).json({ id: resultRows[0].id, ...req.body });
}));
app.put('/api/documents/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { title, description, url } = req.body;
    await db.query('UPDATE documents SET title = $1, description = $2, url = $3 WHERE id = $4', [title, description, url, id]);
    res.json({ id, ...req.body });
}));
app.delete('/api/documents/:id', deleteById('documents'));

// MENUS
app.get('/api/menus', getAll('daily_menus'));
app.post('/api/menus', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    
    // Check for an existing menu for this date.
    const { rows: existing } = await db.query('SELECT id FROM daily_menus WHERE date = $1 LIMIT 1', [date]);

    if (existing.length > 0) {
        // --- UPDATE existing menu ---
        const existingId = existing[0].id;
        await db.query('UPDATE daily_menus SET starter = $1, "mainCourse" = $2, dessert = $3, snack = $4, "photoUrl" = $5 WHERE id = $6', [starter, mainCourse, dessert, snack, photoUrl || null, existingId]);
        const { rows: updatedRows } = await db.query('SELECT * FROM daily_menus WHERE id = $1', [existingId]);
        res.status(200).json(updatedRows[0]);
    } else {
        // --- INSERT new menu ---
        const { rows: resultRows } = await db.query('INSERT INTO daily_menus (date, starter, "mainCourse", dessert, snack, "photoUrl") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [date, starter, mainCourse, dessert, snack, photoUrl || null]);
        
        const menuDate = new Date(date);
        const dayOfWeek = menuDate.getUTCDay();
        const diff = menuDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeekStr = new Date(menuDate.setUTCDate(diff)).toISOString().split('T')[0];

        const { rows: existingNotifications } = await db.query("SELECT id FROM notifications WHERE message = $1 AND timestamp >= $2", ['Le menu de la semaine est disponible.', startOfWeekStr]);
        if (existingNotifications.length === 0) {
            const { rows: parents } = await db.query("SELECT id FROM users WHERE role = 'parent'");
            for (const parent of parents) {
                addNotification(db, { userId: parent.id, message: 'Le menu de la semaine est disponible.', type: 'info', link: 'cantine' });
            }
        }
        
        const { rows: newMenu } = await db.query('SELECT * FROM daily_menus WHERE id = $1', [resultRows[0].id]);
        res.status(201).json(newMenu[0]);
    }
}));
app.put('/api/menus/:id', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { id } = req.params;
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    const { rows: existing } = await db.query('SELECT id FROM daily_menus WHERE date = $1 AND id != $2', [date, id]);
    if (existing.length > 0) return res.status(409).json({ message: `Un menu existe déjà pour la date ${new Date(date).toLocaleDateString('fr-FR')}.` });
    await db.query('UPDATE daily_menus SET date = $1, starter = $2, "mainCourse" = $3, dessert = $4, snack = $5, "photoUrl" = $6 WHERE id = $7', [date, starter, mainCourse, dessert, snack, photoUrl || null, id]);
    const { rows: updatedRows } = await db.query('SELECT * FROM daily_menus WHERE id = $1', [id]);
    if (updatedRows.length === 0) {
        return res.status(404).json({ message: 'Menu non trouvé après la mise à jour.' });
    }
    res.json(updatedRows[0]);
}));
app.delete('/api/menus/:id', deleteById('daily_menus'));

// NOTIFICATIONS
app.get('/api/notifications', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    const { rows } = await db.query('SELECT * FROM notifications ORDER BY timestamp DESC');
    res.json(rows);
}));
app.post('/api/notifications/:id/read', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    await db.query('UPDATE notifications SET "read" = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
}));
app.post('/api/notifications/user/:userId/read-all', asyncHandler(async (req, res) => {
    const db = await getDbPool();
    await db.query('UPDATE notifications SET "read" = true WHERE "userId" = $1', [req.params.userId]);
    res.json({ success: true });
}));

// --- Gestionnaire d'erreurs final ---
app.use((err, req, res, next) => {
    console.error("Erreur finale non gérée:", err);
    res.status(500).send('Quelque chose s\'est mal passé !');
});

// Start server
app.listen(port, () => {
    console.log(`Le serveur backend pour Dar Ennadjah est en cours d'exécution sur http://localhost:${port}`);
    console.log(`Visitez http://localhost:${port}/api/status pour vérifier la connexion à la base de données.`);
});