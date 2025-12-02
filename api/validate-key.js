// api/validate-key.js
const { MongoClient } = require('mongodb');

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
        return res.status(405).json({ valid: false, message: 'Método não permitido' });
    }

    try {
        const { key, hwid, panel } = req.body;

        // Validações
        if (!key) {
            return res.json({
                valid: false,
                message: 'Chave não fornecida'
            });
        }

        if (!panel) {
            return res.json({
                valid: false,
                message: 'Painel não especificado'
            });
        }

        // Conectar ao MongoDB
        const client = await connectToDatabase();
        const db = client.db('key_system');
        const keys = db.collection('keys');

        // Buscar chave
        const keyDoc = await keys.findOne({ key: key.toUpperCase() });

        if (!keyDoc) {
            console.log(`❌ Chave não encontrada: ${key}`);
            return res.json({
                valid: false,
                message: 'Chave inválida'
            });
        }

        // Verificar painel
        if (keyDoc.panel !== panel) {
            console.log(`❌ Painel incorreto: ${key} (esperado: ${keyDoc.panel}, recebido: ${panel})`);
            return res.json({
                valid: false,
                message: 'Esta chave não é válida para este painel'
            });
        }

        // Verificar se está ativa
        if (!keyDoc.active) {
            console.log(`❌ Chave desativada: ${key}`);
            return res.json({
                valid: false,
                message: 'Esta chave foi desativada'
            });
        }

        // Verificar expiração
        if (new Date() > new Date(keyDoc.expiresAt)) {
            console.log(`❌ Chave expirada: ${key}`);
            return res.json({
                valid: false,
                message: 'Esta chave está expirada'
            });
        }

        // Verificar limite de usos
        if (keyDoc.maxUses > 0 && keyDoc.uses >= keyDoc.maxUses) {
            console.log(`❌ Limite de usos atingido: ${key}`);
            return res.json({
                valid: false,
                message: 'Limite de usos atingido'
            });
        }

        // Verificar HWID
        if (hwid) {
            if (keyDoc.hwid === null) {
                // Primeira vez usando, vincular HWID
                await keys.updateOne(
                    { key },
                    { $set: { hwid } }
                );
                console.log(`🔗 HWID vinculado: ${key} -> ${hwid}`);
            } else if (keyDoc.hwid !== hwid) {
                console.log(`❌ HWID não corresponde: ${key}`);
                return res.json({
                    valid: false,
                    message: 'Esta chave está vinculada a outro dispositivo'
                });
            }
        }

        // Atualizar uso
        await keys.updateOne(
            { key },
            { 
                $inc: { uses: 1 },
                $set: { lastUsed: new Date() }
            }
        );

        console.log(`✅ Chave validada: ${key} (painel: ${panel})`);

        res.json({
            valid: true,
            message: 'Chave válida',
            data: {
                key,
                panel: keyDoc.panel,
                owner: keyDoc.owner,
                expiresAt: keyDoc.expiresAt,
                uses: keyDoc.uses + 1,
                maxUses: keyDoc.maxUses
            }
        });

    } catch (error) {
        console.error('❌ Erro ao validar chave:', error);
        res.status(500).json({
            valid: false,
            message: 'Erro ao validar chave. Tente novamente.'
        });
    }
};
