import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware de segurança
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {

  // 1. Recebe o token que vem no cabeçalho "Authorization"
  const authHeader = req.headers.authorization;

  // 2. Verifica se o cabeçalho existe
  if (!authHeader) {
    return res.status(401).json({ error: 'Nenhum token fornecido.' });
  }

  // 3. O formato do token é "Bearer TOKEN_LONGO_AQUI"
  // Dividi-lo em duas partes
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const [scheme, token] = parts;
  // 4. Verifica se o "esquema" é "Bearer"
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado.' });
  }

  // 5. Validar o token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // 6. Anexa os dados do utilizador ao 'req' para as rotas futuras usarem
    req.user = decoded as { id: string; email: string };

    // 7. Deixa a requisição continuar
    return next();
    
  } catch (error) {
    // Se o token for inválido, expirado, ou a assinatura falhar
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};