import { Request, Response } from "express";
import { UserService } from "../services/user.service";

const userService = new UserService();

export class AuthController {
  // Método para o registro
  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Chama o service para criar o usuário
      const newUser = await userService.create(email, password);

      // Sucesso
      return res.status(201).json(newUser);
    } catch (error: any) {
      // Trata os erros que o service retornou
      if (error.message === "Este email já está em uso.") {
        return res.status(409).json({ error: error.message }); // 409 Conflict
      }

      if (error.message === "Email e senha são obrigatórios.") {
        return res.status(400).json({ error: error.message }); // 400 Bad Request
      }

      // Erro genérico
      console.error(error);
      return res.status(500).json({ error: "Erro interno ao criar usuário." });
    }
  }

  // Método pra login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Chama o service para login
      const result = await userService.login(email, password);

      // Sucesso
      return res.status(200).json(result); // Retorna o token
    } catch (error: any) {
      // Trata o erro de "Credenciais inválidas"
      if (error.message === "Credenciais inválidas.") {
        return res.status(401).json({ error: error.message }); // 401 Unauthorized
      }

      // Erro genérico
      console.error(error);
      return res.status(500).json({ error: "Erro interno no login." });
    }
  }

  // Método para buscar dados do utilizador
  async getMe(req: Request, res: Response) {
    // Se o código chegou aqui, o 'authMiddleware' já foi executado
    // e validou o token. Os dados do utilizador estão em 'req.user'.

    if (!req.user) {
      return res.status(401).json({ error: "Utilizador não autenticado." });
    }

    // Devolve os dados que o middleware colocou no 'req'
    return res.status(200).json(req.user);
  }
}
