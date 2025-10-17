
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// --- Database Connection ---
let db;
async function connectToDatabase() {
    try {
        db = await mysql.createPool(process.env.DATABASE_URL);
        console.log('✅ Connecté à la base de données PlanetScale.');
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE: Impossible de se connecter à la base de données.', error);
        process.exit(1);
    }
}

// --- Email Transporter (OAuth2) ---
let transporter;
async function setupEmailTransporter() {
    // Valider que toutes les variables d'environnement nécessaires sont présentes
    const requiredEnvVars = ['EMAIL_USER', 'OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'OAUTH_REFRESH_TOKEN'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        console.error(`❌ ERREUR CRITIQUE: Variables d'environnement manquantes pour l'email: ${missingVars.join(', ')}`);
        console.error('Le serveur ne peut pas démarrer sans la configuration complète pour l\'envoi d\'emails.');
        process.exit(1);
    }

    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ Connexion au service email (Gmail OAuth2) réussie.');
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE: La vérification de la connexion email a échoué.', error);
        console.error('Veuillez vérifier les variables d\'environnement (OAUTH_...) sur Render et la configuration de votre projet Google Cloud.');
        process.exit(1); // Arrêter le serveur si la config email est invalide
    }
}


// --- Utility Functions ---
const generateRandomPassword = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// --- API Endpoints ---
const API_PREFIX = '/api';

app.get(API_PREFIX, (req, res) => {
    res.send('API Dar Ennadjah - Statut: Opérationnel');
});

// Auth
app.post(`${API_PREFIX}/parent-login`, async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ? AND role = "parent"', [email, password]);
        if (rows.length > 0) {
            const { password, ...user } = rows[0];
            res.json(user);
        } else {
            res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post(`${API_PREFIX}/admin-login`, async (req, res) => {
    const { password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE password = ? AND role = "admin"', [password]);
        if (rows.length > 0) {
            const { password, ...user } = rows[0];
            res.json(user);
        } else {
            res.status(401).json({ message: 'Mot de passe incorrect.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Users (Generic, used for Parents)
app.get(`${API_PREFIX}/users`, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nom, email, role, telephone FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get(`${API_PREFIX}/users/:id`, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nom, email, role, telephone FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get(`${API_PREFIX}/admin-user`, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nom, email, role, telephone FROM users WHERE role = "admin" LIMIT 1');
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Administrateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post(`${API_PREFIX}/users`, async (req, res) => {
    const { nom, email, telephone } = req.body;
    const generatedPassword = generateRandomPassword();
    try {
        const [result] = await db.query('INSERT INTO users (nom, email, telephone, password, role) VALUES (?, ?, ?, ?, "parent")', [nom, email, telephone, generatedPassword]);
        const newUser = { id: result.insertId, nom, email, telephone, role: 'parent', generatedPassword };
        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: "Cette adresse email est déjà utilisée." });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

app.put(`${API_PREFIX}/users/:id`, async (req, res) => {
    const { nom, email, telephone } = req.body;
    try {
        await db.query('UPDATE users SET nom = ?, email = ?, telephone = ? WHERE id = ?', [nom, email, telephone, req.params.id]);
        res.json({ id: req.params.id, nom, email, telephone });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete(`${API_PREFIX}/users/:id`, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post(`${API_PREFIX}/users/:id/reset-password`, async (req, res) => {
    const newPassword = generateRandomPassword();
    try {
        await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.params.id]);
        res.json({ newPassword });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post(`${API_PREFIX}/users/:id/send-password`, async (req, res) => {
    const { password } = req.body;
    try {
        const [rows] = await db.query('SELECT nom, email FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Parent non trouvé." });
        }
        const parent = rows[0];

        const mailOptions = {
            from: `"Dar Ennadjah" <${process.env.EMAIL_USER}>`,
            to: parent.email,
            subject: 'Vos identifiants de connexion - Dar Ennadjah',
            html: `
                <p>Bonjour ${parent.nom},</p>
                <p>Voici vos identifiants pour accéder à l'espace parent de Dar Ennadjah :</p>
                <ul>
                    <li><strong>Email :</strong> ${parent.email}</li>
                    <li><strong>Mot de passe :</strong> ${password}</li>
                </ul>
                <p>Cordialement,<br>L'administration de Dar Ennadjah</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur d'envoi d'email:", error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
    }
});


// Generic CRUD for simple tables
const createCrudEndpoints = (tableName) => {
    app.get(`${API_PREFIX}/${tableName}`, async (req, res) => {
        try {
            const [rows] = await db.query(`SELECT * FROM ${tableName}`);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    app.post(`${API_PREFIX}/${tableName}`, async (req, res) => {
        const columns = Object.keys(req.body).join(', ');
        const placeholders = Object.keys(req.body).map(() => '?').join(', ');
        const values = Object.values(req.body);
        try {
            const [result] = await db.query(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`, values);
            res.status(201).json({ id: result.insertId, ...req.body });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    app.put(`${API_PREFIX}/${tableName}/:id`, async (req, res) => {
        const updates = Object.keys(req.body).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(req.body), req.params.id];
        try {
            await db.query(`UPDATE ${tableName} SET ${updates} WHERE id = ?`, values);
            res.json({ id: req.params.id, ...req.body });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    app.delete(`${API_PREFIX}/${tableName}/:id`, async (req, res) => {
        try {
            await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
};

createCrudEndpoints('students');
createCrudEndpoints('teachers');
createCrudEndpoints('grades');
createCrudEndpoints('attendance');
createCrudEndpoints('observations');
createCrudEndpoints('events');
createCrudEndpoints('documents');
createCrudEndpoints('menus');
createCrudEndpoints('notifications');

// --- Custom Endpoints ---

// Timetable
app.post(`${API_PREFIX}/timetable`, async (req, res) => {
    const { classe } = req.query;
    const timetableEntries = req.body;
    if (!classe) return res.status(400).json({ message: "La classe est requise." });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM timetable_entries WHERE classe = ?', [classe]);
        if (timetableEntries.length > 0) {
            const values = timetableEntries.map(e => [e.day, e.time, e.subject, e.teacher, classe]);
            await connection.query('INSERT INTO timetable_entries (day, time, subject, teacher, classe) VALUES ?', [values]);
        }
        await connection.commit();
        const [newEntries] = await connection.query('SELECT * FROM timetable_entries WHERE classe = ?', [classe]);
        res.status(201).json(newEntries);
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});
app.get(`${API_PREFIX}/timetable`, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM timetable_entries');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Messages
app.post(`${API_PREFIX}/messages`, async (req, res) => {
    const { senderId, receiverId, contenu, date, attachmentName, attachmentUrl } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO messages (senderId, receiverId, contenu, date, attachmentName, attachmentUrl) VALUES (?, ?, ?, ?, ?, ?)',
            [senderId, receiverId, contenu, date, attachmentName ?? null, attachmentUrl ?? null]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
app.get(`${API_PREFIX}/messages`, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM messages');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Start Server ---
async function startServer() {
    await connectToDatabase();
    await setupEmailTransporter();
    app.listen(PORT, () => {
        console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
    });
}

startServer();
