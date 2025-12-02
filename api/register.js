// api/register.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Connection string com senha
const MONGODB_URI = 'mongodb+srv://swelokumesd81_db_user:Sempre00.@cluster0.sxwnhrt.mongodb.net/?appName=Cluster0';

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

// Importar função de verificação de código
const { verifyCode } = require('./send-verification-code');

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
        const { email, password, verificationCode } = req.body;

        // Validações
        if (!email || !password || !verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'Preencha todos os campos'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter no mínimo 8 caracteres'
            });
        }

        // Verificar código
        const codeValidation = verifyCode(email, verificationCode);
        if (!codeValidation.valid) {
            return res.status(400).json({
                success: false,
                message: codeValidation.message
            });
        }

        // Conectar ao MongoDB
        const client = await connectToDatabase();
        const db = client.db('key_system');
        const users = db.collection('users');

        // Verificar se email já existe
        const existingUser = await users.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Este email já está cadastrado'
            });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const newUser = {
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date(),
            panels: [],
            isAdmin: false
        };

        await users.insertOne(newUser);

        console.log(`✅ Novo usuário criado: ${email}`);

        res.status(200).json({
            success: true,
            message: 'Conta criada com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao criar conta:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar conta. Tente novamente.'
        });
    }
};
