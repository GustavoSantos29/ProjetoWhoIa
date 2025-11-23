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

  //Deleta uma empresa associada a um usuário
  async delete(userId: string) {
    // 1. Acha o usuário para pegar o ID da empresa
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user || !user.companyId) {
      throw new Error('Usuário não possui empresa para excluir.');
    }

    const companyId = user.companyId;

    // 2. Transação Atômica (Segurança)
    await prisma.$transaction([
      // A. Primeiro: Desvincula o usuário (tira o ID da empresa dele)
      prisma.user.update({
        where: { id: userId },
        data: { companyId: null }
      }),
      
      // B. Segundo: Deleta a empresa
      // (O banco vai apagar os DataPoints automaticamente por causa do Cascade)
      prisma.company.delete({
        where: { id: companyId }
      })
    ]);

    return { message: "Empresa excluída com sucesso." };
  }
}
