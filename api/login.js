// api/login.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Connection string com senha
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

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método não permitido' });
    }

    try {
        const { email, password } = req.body;

        // Validações
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Preencha todos os campos'
            });
        }

        // Conectar ao MongoDB
        const client = await connectToDatabase();
        const db = client.db('key_system');
        const users = db.collection('users');

        // Buscar usuário
        const user = await users.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Criar token JWT
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin || false
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Atualizar último login
        await users.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        console.log(`✅ Login bem-sucedido: ${email}`);

        res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            token,
            user: {
                email: user.email,
                isAdmin: user.isAdmin || false,
                panels: user.panels || []
            }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao fazer login. Tente novamente.'
        });
    }
};
