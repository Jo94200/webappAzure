const express = require('express');
const ldap = require('ldapjs');
const sql = require('mssql');
const bodyParser = require('body-parser');
const app = express();

// Middleware pour parser les données du formulaire
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration de la base de données Azure SQL
const dbConfig = {
    user: 'jsa',
    password: 'sa160799sa!',
    server: 'chinook-db.database.windows.net', // URL du serveur SQL
    database: 'ChinookDB', // Nom de la base de données
    options: {
        encrypt: true, // Requis pour les connexions sécurisées
        enableArithAbort: true
    }
};

// Fonction pour se connecter à la base de données
async function connectToDatabase() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connecté à la base de données');
        return pool;
    } catch (err) {
        console.error('Erreur de connexion à la base de données', err);
        return null;
    }
}

// Configuration de la connexion LDAP à Active Directory
const ldapClient = ldap.createClient({
    url: 'ldap://10.0.3.4:389',  // IP du serveur DC, port 389 pour LDAP
});

// Route pour la page de connexion
app.get('/login', (req, res) => {
    res.send(`
        <h1>Connexion</h1>
        <form action="/auth" method="post">
            <label>Nom d'utilisateur:</label>
            <input type="text" name="username" required /><br>
            <label>Mot de passe:</label>
            <input type="password" name="password" required /><br>
            <button type="submit">Se connecter</button>
        </form>
    `);
});

// Authentification via LDAP
app.post('/auth', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Le DN (Distinguished Name) doit être ajusté en fonction de la structure AD
    const dn = `cn=${username},cn=Users,dc=my,dc=login`;
    console.log(username, password, dn)
    // Tentative d'authentification avec LDAP
    ldapClient.bind(dn, password, (err) => {
        if (err) {
            console.log('Échec de l\'authentification via LDAP', err);
            return res.send(`
                <h1>Échec de connexion</h1>
                <p>Nom d'utilisateur ou mot de passe incorrect.</p>
                <a href="/login">Réessayer</a>
            `);
        }

        // Si l'authentification réussit, on affiche les artistes
        res.redirect('/artists');
    });
});

// Route pour afficher les artistes après authentification
app.get('/artists', async (req, res) => {
    const pool = await connectToDatabase();
    if (!pool) {
        return res.send('Erreur de connexion à la base de données');
    }

    try {
        const result = await pool.request().query('SELECT * FROM Artist');
        const artists = result.recordset;

        let html = '<h1>Liste des artistes</h1><ul>';
        artists.forEach(artist => {
            html += `<li>${artist.Name}</li>`;
        });
        html += '</ul>';
        res.send(html);
    } catch (err) {
        console.error('Erreur lors de la récupération des artistes', err);
        res.send('Erreur lors de la récupération des artistes');
    }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
