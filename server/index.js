// INSTRUCTIONS:
// 1. Placez ce fichier et `package.json` dans un nouveau dossier `server` à la racine de votre projet.
// 2. Ouvrez un terminal dans le dossier `server`.
// 3. Exécutez `npm install` pour installer les dépendances.
// 4. Exécutez `node index.js` pour démarrer le serveur.
// 5. Votre application frontend devrait maintenant pouvoir communiquer avec votre base de données via ce serveur.

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://rhufozmdwtnsbqrqtyiu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJodWZvem1kd3Ruc2JxcnF0eWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTAzNDcsImV4cCI6MjA3NTkyNjM0N30.MOO8sr-K6r_qnxrJZyOAMREEPc-8NhRu7IMF3TavefQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CONFIGURATION NODEMAILER ---
const transporter = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: 'prince_lkr@hotmail.fr',
        pass: "5VMvrKQhlyaWaO5M"
    }
});

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

// --- FONCTIONS UTILITAIRES ---

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
        if (err instanceof multer.MulterError) {
            console.error("Erreur Multer détectée:", err);
            return res.status(400).json({ message: `Erreur de téléversement: ${err.message}` });
        }
        console.error("--- ERREUR API NON GÉRÉE ---");
        console.error(err);
        const errorMessage = (err && err.message) ? err.message : 'Une erreur interne du serveur est survenue.';
        res.status(500).json({ message: errorMessage, error: err.stack });
    });

const generateRandomPassword = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// --- NOTIFICATION HELPER ---
const addNotification = async ({ userId, message, type, link }) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                userId: userId,
                message: message,
                type: type,
                link: link,
                read: false,
                timestamp: new Date().toISOString()
            });
        
        if (error) {
            console.error('Erreur lors de l\'ajout de la notification:', error);
        }
    } catch (error) {
        console.error('Erreur dans addNotification:', error);
    }
};

// --- POINT DE TERMINAISON DE STATUT ---
app.get('/api/status', asyncHandler(async (req, res) => {
    try {
        console.log("🔍 Tentative de connexion à Supabase...");
        
        // Test de connexion avec Supabase
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({ 
                status: 'error', 
                message: 'Erreur de connexion à la base de données',
                error: error.message 
            });
        }

        console.log('✅ Connexion Supabase réussie!');
        res.json({ 
            status: 'success', 
            message: 'Connexion à la base de données établie avec succès',
            database: 'Supabase PostgreSQL',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erreur générale:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erreur serveur',
            error: error.message 
        });
    }
}));

// --- SÉCURITÉ : Whitelist pour les noms de tables ---
const allowedTables = new Set(['users', 'students', 'teachers', 'grades', 'attendance', 'observations', 'timetable_entries', 'messages', 'events', 'documents', 'daily_menus', 'notifications']);

// --- API Endpoints ---

// GET ALL pour n'importe quelle table
const getAll = (tableName) => asyncHandler(async (req, res) => {
    if (!allowedTables.has(tableName)) {
        return res.status(400).json({ message: "Opération non autorisée." });
    }
    
    const { data, error } = await supabase
        .from(tableName)
        .select('*');
    
    if (error) throw error;
    res.json(data);
});

// DELETE BY ID pour n'importe quelle table
const deleteById = (tableName) => asyncHandler(async (req, res) => {
    if (!allowedTables.has(tableName)) {
        return res.status(400).json({ message: "Opération non autorisée." });
    }
    
    const { id } = req.params;
    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    res.status(204).send();
});

// --- ROUTES SPÉCIFIQUES ---

// AUTHENTICATION
app.post('/api/parent-login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'parent')
        .single();

    if (error || !data || data.password !== password) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    
    const { password: userPassword, ...userWithoutPassword } = data;
    res.json(userWithoutPassword);
}));

// USERS
app.get('/api/users', getAll('users'));
app.post('/api/users', asyncHandler(async (req, res) => {
    const { nom, email, role, telephone } = req.body;
    const generatedPassword = generateRandomPassword();
    
    const { data, error } = await supabase
        .from('users')
        .insert([
            { 
                nom, 
                email, 
                role, 
                telephone, 
                password: generatedPassword 
            }
        ])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ ...data, generatedPassword });
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom, email, role, telephone } = req.body;
    
    const { data, error } = await supabase
        .from('users')
        .update({ nom, email, role, telephone })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.post('/api/users/:id/reset-password', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const newPassword = generateRandomPassword();
    
    const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id);

    if (error) throw error;
    res.json({ newPassword });
}));

app.post('/api/users/:id/send-password', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ message: 'Le mot de passe est requis.' });
    }
    
    const { data: user, error } = await supabase
        .from('users')
        .select('email, nom')
        .eq('id', id)
        .single();

    if (error || !user) {
        return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #4169E1; border-bottom: 2px solid #FACC15; padding-bottom: 10px;">Vos identifiants pour l'espace parent Dar Ennadjah</h2>
            <p>Bonjour <strong>${user.nom}</strong>,</p>
            <p>Voici vos informations de connexion pour accéder à l'application de l'école :</p>
            <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Email :</strong> ${user.email}</p>
                <p style="margin: 0;"><strong>Mot de passe :</strong> 
                    <span style="font-weight: bold; font-size: 1.2em; background-color: #e0e0e0; padding: 5px 10px; border-radius: 5px; letter-spacing: 1px;">${password}</span>
                </p>
            </div>
            <p>Nous vous recommandons de conserver ce mot de passe en lieu sûr et de ne pas le partager.</p>
            <p style="margin-top: 30px;">Cordialement,<br>L'équipe de Dar Ennadjah</p>
        </div>
    `;

    const mailOptions = { 
        from: `"Dar Ennadjah" <${transporter.options.auth.user}>`, 
        to: user.email, 
        subject: 'Vos identifiants de connexion pour Dar Ennadjah', 
        html: emailHtml
    };
    
    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: `Email envoyé avec succès à ${user.email}` });
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        res.status(500).json({ message: "Échec de l'envoi de l'email. Vérifiez la configuration du serveur.", error: error.message });
    }
}));

app.delete('/api/users/:id', deleteById('users'));

// STUDENTS
app.get('/api/students', getAll('students'));
app.post('/api/students', asyncHandler(async (req, res) => {
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived = false, photoUrl } = req.body;
    
    const { data, error } = await supabase
        .from('students')
        .insert([
            { 
                nom, 
                prenom, 
                dateNaissance, 
                classe, 
                niveauScolaire, 
                parentId, 
                isArchived, 
                photoUrl 
            }
        ])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json(data);
}));

app.put('/api/students/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, dateNaissance, classe, niveauScolaire, parentId, isArchived, photoUrl } = req.body;
    
    const { data, error } = await supabase
        .from('students')
        .update({ 
            nom, 
            prenom, 
            dateNaissance, 
            classe, 
            niveauScolaire, 
            parentId, 
            isArchived, 
            photoUrl 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

// TEACHERS
app.get('/api/teachers', getAll('teachers'));
app.post('/api/teachers', asyncHandler(async (req, res) => {
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    
    const { data, error } = await supabase
        .from('teachers')
        .insert([
            { 
                nom, 
                prenom, 
                matiere, 
                telephone, 
                photoUrl, 
                classes: classes || [] 
            }
        ])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json(data);
}));

app.put('/api/teachers/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, matiere, telephone, photoUrl, classes } = req.body;
    
    const { data, error } = await supabase
        .from('teachers')
        .update({ 
            nom, 
            prenom, 
            matiere, 
            telephone, 
            photoUrl, 
            classes: classes || [] 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/teachers/:id', deleteById('teachers'));

// GRADES
app.get('/api/grades', getAll('grades'));
app.post('/api/grades', asyncHandler(async (req, res) => {
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    
    const { data, error } = await supabase
        .from('grades')
        .insert([
            { 
                studentId, 
                matiere, 
                note, 
                coefficient, 
                periode, 
                date 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notification
    const { data: student } = await supabase
        .from('students')
        .select('parentId, prenom')
        .eq('id', studentId)
        .single();

    if (student) {
        await addNotification({ 
            userId: student.parentId, 
            message: `Nouvelle note en ${matiere} pour ${student.prenom}: ${note}/20.`, 
            type: 'info', 
            link: 'suivi' 
        });
    }

    res.status(201).json(data);
}));

app.put('/api/grades/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, matiere, note, coefficient, periode, date } = req.body;
    
    const { data, error } = await supabase
        .from('grades')
        .update({ 
            studentId, 
            matiere, 
            note, 
            coefficient, 
            periode, 
            date 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/grades/:id', deleteById('grades'));

// ATTENDANCE
app.get('/api/attendance', getAll('attendance'));
app.post('/api/attendance', asyncHandler(async (req, res) => {
    const { studentId, date, statut, justification } = req.body;
    
    const { data, error } = await supabase
        .from('attendance')
        .insert([
            { 
                studentId, 
                date, 
                statut, 
                justification 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notification
    const { data: student } = await supabase
        .from('students')
        .select('parentId, prenom')
        .eq('id', studentId)
        .single();

    if (student) {
        await addNotification({ 
            userId: student.parentId, 
            message: `Nouveau suivi pour ${student.prenom}: ${statut} le ${new Date(date).toLocaleDateString('fr-FR')}.`, 
            type: statut.includes('Absent') ? 'error' : 'info', 
            link: 'suivi' 
        });
    }

    res.status(201).json(data);
}));

app.put('/api/attendance/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, date, statut, justification } = req.body;
    
    const { data, error } = await supabase
        .from('attendance')
        .update({ 
            studentId, 
            date, 
            statut, 
            justification 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/attendance/:id', deleteById('attendance'));

// OBSERVATIONS
app.get('/api/observations', getAll('observations'));
app.post('/api/observations', asyncHandler(async (req, res) => {
    const { studentId, content, date, author } = req.body;
    
    const { data, error } = await supabase
        .from('observations')
        .insert([
            { 
                studentId, 
                content, 
                date, 
                author: author || 'Administration' 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notification
    const { data: student } = await supabase
        .from('students')
        .select('parentId, prenom')
        .eq('id', studentId)
        .single();

    if (student) {
        await addNotification({ 
            userId: student.parentId, 
            message: `Nouvelle observation pour ${student.prenom}.`, 
            type: 'info', 
            link: 'observations' 
        });
    }

    res.status(201).json(data);
}));

app.put('/api/observations/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, content, date, author } = req.body;
    
    const { data, error } = await supabase
        .from('observations')
        .update({ 
            studentId, 
            content, 
            date, 
            author: author || 'Administration' 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/observations/:id', deleteById('observations'));

// MESSAGES
app.get('/api/messages', getAll('messages'));
app.post('/api/messages', asyncHandler(async (req, res) => {
    const { senderId, receiverId, contenu, date, attachmentName, attachmentUrl } = req.body;
    
    const { data, error } = await supabase
        .from('messages')
        .insert([
            { 
                senderId, 
                receiverId, 
                contenu, 
                date, 
                attachmentName, 
                attachmentUrl 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notification
    const { data: sender } = await supabase
        .from('users')
        .select('nom')
        .eq('id', senderId)
        .single();

    if (sender) {
        await addNotification({ 
            userId: receiverId, 
            message: `Nouveau message de ${sender.nom}.`, 
            type: 'info', 
            link: 'messages' 
        });
    }

    res.status(201).json(data);
}));

// EVENTS
app.get('/api/events', getAll('events'));
app.post('/api/events', asyncHandler(async (req, res) => {
    const { title, description, event_date } = req.body;
    
    const { data, error } = await supabase
        .from('events')
        .insert([
            { 
                title, 
                description, 
                event_date 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notifications à tous les parents
    const { data: parents } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'parent');

    if (parents) {
        for (const parent of parents) {
            await addNotification({ 
                userId: parent.id, 
                message: `Nouvel événement : "${title}" le ${new Date(event_date).toLocaleDateString('fr-FR')}.`, 
                type: 'info', 
                link: 'evenements' 
            });
        }
    }

    res.status(201).json(data);
}));

app.put('/api/events/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, event_date } = req.body;
    
    const { data, error } = await supabase
        .from('events')
        .update({ 
            title, 
            description, 
            event_date 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/events/:id', deleteById('events'));

// DOCUMENTS
app.get('/api/documents', getAll('documents'));
app.post('/api/documents', asyncHandler(async (req, res) => {
    const { title, description, url } = req.body;
    
    const { data, error } = await supabase
        .from('documents')
        .insert([
            { 
                title, 
                description, 
                url 
            }
        ])
        .select()
        .single();

    if (error) throw error;

    // Notifications à tous les parents
    const { data: parents } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'parent');

    if (parents) {
        for (const parent of parents) {
            await addNotification({ 
                userId: parent.id, 
                message: `Nouveau document disponible : "${title}".`, 
                type: 'info', 
                link: 'documents' 
            });
        }
    }

    res.status(201).json(data);
}));

app.put('/api/documents/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, url } = req.body;
    
    const { data, error } = await supabase
        .from('documents')
        .update({ 
            title, 
            description, 
            url 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/documents/:id', deleteById('documents'));

// MENUS
app.get('/api/menus', getAll('daily_menus'));
app.post('/api/menus', asyncHandler(async (req, res) => {
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    
    // Vérifier si un menu existe déjà pour cette date
    const { data: existing } = await supabase
        .from('daily_menus')
        .select('*')
        .eq('date', date)
        .single();

    let result;
    
    if (existing) {
        // Mettre à jour le menu existant
        const { data, error } = await supabase
            .from('daily_menus')
            .update({ 
                starter, 
                mainCourse, 
                dessert, 
                snack, 
                photoUrl 
            })
            .eq('id', existing.id)
            .select()
            .single();
            
        if (error) throw error;
        result = data;
    } else {
        // Créer un nouveau menu
        const { data, error } = await supabase
            .from('daily_menus')
            .insert([
                { 
                    date, 
                    starter, 
                    mainCourse, 
                    dessert, 
                    snack, 
                    photoUrl 
                }
            ])
            .select()
            .single();
            
        if (error) throw error;
        result = data;
    }

    res.status(existing ? 200 : 201).json(result);
}));

app.put('/api/menus/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, starter, mainCourse, dessert, snack, photoUrl } = req.body;
    
    const { data, error } = await supabase
        .from('daily_menus')
        .update({ 
            date, 
            starter, 
            mainCourse, 
            dessert, 
            snack, 
            photoUrl 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
}));

app.delete('/api/menus/:id', deleteById('daily_menus'));

// NOTIFICATIONS
app.get('/api/notifications', getAll('notifications'));
app.post('/api/notifications/:id/read', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
}));

app.post('/api/notifications/user/:userId/read-all', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('userId', userId);

    if (error) throw error;
    res.json({ success: true });
}));

// TIMETABLE (spécial - nécessite une logique particulière)
app.get('/api/timetable', getAll('timetable_entries'));

app.post('/api/timetable', asyncHandler(async (req, res) => {
    const { classe } = req.query;
    const entries = req.body;
    
    if (!classe) {
        return res.status(400).json({ message: 'La classe est requise.' });
    }
    
    // Supprimer les anciennes entrées pour cette classe
    const { error: deleteError } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('classe', classe);

    if (deleteError) throw deleteError;

    // Insérer les nouvelles entrées
    const { data, error } = await supabase
        .from('timetable_entries')
        .insert(entries)
        .select();

    if (error) throw error;

    // Notifications aux parents concernés
    const { data: students } = await supabase
        .from('students')
        .select('parentId')
        .eq('classe', classe);

    if (students) {
        const parentIds = [...new Set(students.map(s => s.parentId))];
        for (const parentId of parentIds) {
            if (parentId) {
                await addNotification({ 
                    userId: parentId, 
                    message: `L'emploi du temps pour la classe ${classe} a été mis à jour.`, 
                    type: 'info', 
                    link: 'suivi' 
                });
            }
        }
    }

    res.status(201).json(data);
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