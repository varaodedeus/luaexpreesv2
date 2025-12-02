// api/verify-token.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-key-aqui-mude-isso';

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
        return res.status(405).json({ valid: false, message: 'Método não permitido' });
    }

    try {
        // Pegar token do header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                valid: false,
                message: 'Token não fornecido'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);

        res.status(200).json({
            valid: true,
            user: {
                userId: decoded.userId,
                email: decoded.email,
                isAdmin: decoded.isAdmin
            }
        });

    } catch (error) {
        console.error('❌ Token inválido:', error.message);
        res.status(401).json({
            valid: false,
            message: 'Token inválido ou expirado'
        });
    }
};
