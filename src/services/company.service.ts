// src/services/company.service.ts
import { prisma } from "../lib/prisma";

export class CompanyService {
  /*
   *Important
   * Service para gerenciar as empresas.
   */

  //Cria uma nova empresa e associa ao usuário que a criou.
  async create(name: string, userId: string) {
    // 1. Busca o usuário para ver se ele já tem uma empresa
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    if (user.companyId) {
      throw new Error("Este usuário já está associado a uma empresa.");
    }

    // 2. Ou ambos (criar empresa E atualizar usuário) funcionam, ou nenhum funciona.
    const transactionResult = await prisma.$transaction(async (tx) => {
      // a. Cria a nova empresa
      const newCompany = await tx.company.create({
        data: {
          name: name,
        },
      });

      // b. Atualiza o usuário, ligando-o à nova empresa
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          companyId: newCompany.id,
        },
      });

      return { company: newCompany, user: updatedUser };
    });

    return transactionResult.company;
  }

  //Busca a empresa associada ao usuário logado.
  async getByUserId(userId: string) {
    // Encontra o usuário e puxa os dados da empresa relacionada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true, // Junta"os dados da empresa
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    if (!user.company) {
      return null; // Usuário existe, mas não tem empresa
    }

    return user.company;
  }
}
