import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class UserService {

  /*
   *Important
   * Service para gerenciar os usuários.
   */

  // Método para criar um novo usuário
  async create(email?: string, password?: string) {
    // 1. Validação
    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios.");
    }

    // 2. Verifica se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Este email já está em uso.");
    }

    // 3. Criptografa a senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Salva no banco
    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
      },
    });

    // 5. Remove a senha da resposta
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  // Método de login
  async login(email?: string, password?: string) {
    // 1. Validação
    if (!email || !password) {
      throw new Error("Credenciais inválidas.");
    }

    // 2. Buscar email no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Credenciais inválidas.");
    }

    // 3. Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas.'); 
    }

    // 4. Se chegou aqui, o login está correto. Gerar o Token.
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: '1d', 
      }
    );

    // 5. Retorna o token
    return { token };

  }
  
}
