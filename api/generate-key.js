// api/generate-key.js
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = 'mongodb+srv://swelokumesd81_db_user:Sempre00.@cluster0.sxwnhrt.mongodb.net/?appName=Cluster0';
const JWT_SECRET = 'minha-chave-super-secreta-12345-key-system';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    cachedClient = client;
    return client;
}

// Gerar chave aleatória
function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY';
    
    for (let i = 0; i < 3; i++) {
        key += '-';
        for (let j = 0; j < 4; j++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    return key;
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método não permitido' });
    }

    try {
        // Verificar token
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token não fornecido'
            });
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        const { panel, owner, duration, maxUses } = req.body;

        // Validações
        if (!panel) {
            return res.status(400).json({
                success: false,
                message: 'Painel não especificado'
            });
        }

        // Conectar ao MongoDB
        const client = await connectToDatabase();
        const db = client.db('key_system');
        const keys = db.collection('keys');

        // Gerar chave única
        let key;
        let attempts = 0;
        do {
            key = generateKey();
            const existing = await keys.findOne({ key });
            if (!existing) break;
            attempts++;
        } while (attempts < 10);

        if (attempts >= 10) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao gerar chave única'
            });
        }

        // Calcular data de expiração
        const durationDays = duration || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Criar documento da chave
        const keyDoc = {
            key,
            panel,
            owner: owner || 'Anonymous',
            createdBy: decoded.email,
            createdAt: new Date(),
            expiresAt,
            hwid: null,
            active: true,
            uses: 0,
            maxUses: maxUses || -1,
            lastUsed: null
        };

        await keys.insertOne(keyDoc);

        console.log(`✅ Chave gerada: ${key} para painel ${panel}`);

        res.status(200).json({
            success: true,
            message: 'Chave gerada com sucesso',
            key,
            data: {
                key,
                panel,
                owner: keyDoc.owner,
                expiresAt: keyDoc.expiresAt,
                maxUses: keyDoc.maxUses
            }
        });

    } catch (error) {
        console.error('❌ Erro ao gerar chave:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar chave. Tente novamente.'
        });
    }
};
