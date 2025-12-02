// api/send-verification-code.js
const { Resend } = require('resend');

// Cache de códigos
const codes = new Map();

// Gerar código de 6 dígitos
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        // Inicializar Resend
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Gerar código
        const code = generateCode();
        
        // Salvar código com expiração de 10 minutos
        codes.set(email.toLowerCase(), {
            code,
            expires: Date.now() + 10 * 60 * 1000
        });

        // Enviar email
        await resend.emails.send({
            from: 'Key System <onboarding@resend.dev>',
            to: email,
            subject: '🔐 Seu Código de Verificação',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .code-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .code { font-size: 42px; font-weight: 800; color: #667eea; letter-spacing: 8px; margin: 0; font-family: monospace; }
        .info { color: #6c757d; font-size: 14px; margin-top: 10px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Verificação de Email</h1>
        </div>
        <div class="content">
            <h2 style="color: #333; margin-top: 0;">Olá!</h2>
            <p style="color: #666; line-height: 1.6;">
                Você está criando uma conta no <strong>Key System Dashboard</strong>.
                Use o código abaixo para verificar seu email:
            </p>
            
            <div class="code-box">
                <p class="code">${code}</p>
                <p class="info">Este código expira em 10 minutos</p>
            </div>

            <div class="warning">
                <strong>⚠️ Importante:</strong> Se você não solicitou este código, ignore este email.
            </div>

            <p style="color: #666; line-height: 1.6; margin-bottom: 0;">
                Atenciosamente,<br>
                <strong>Equipe Key System</strong>
            </p>
        </div>
        <div class="footer">
            Este é um email automático, não responda.
        </div>
    </div>
</body>
</html>
            `
        });

        console.log(`✅ Código enviado para ${email}: ${code}`);

        res.status(200).json({
            success: true,
            message: 'Código enviado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao enviar código:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar código. Tente novamente.'
        });
    }
};

// Exportar função para verificar código
module.exports.verifyCode = (email, code) => {
    const stored = codes.get(email.toLowerCase());
    
    if (!stored) {
        return { valid: false, message: 'Código não encontrado' };
    }

    if (Date.now() > stored.expires) {
        codes.delete(email.toLowerCase());
        return { valid: false, message: 'Código expirado' };
    }

    if (stored.code !== code) {
        return { valid: false, message: 'Código incorreto' };
    }

    codes.delete(email.toLowerCase());
    return { valid: true };
};
