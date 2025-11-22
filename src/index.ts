// src/index.ts
import express from "express";
import { authRouter } from "./routes/auth.routes";
import { companyRouter } from "./routes/company.routes";
import { dataRouter } from "./routes/data.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import cors from "cors"; // <--- 1. Adicione o import aqui
const app = express();
app.use(cors());
const PORT = 3000;

// Middleware para o Express entender JSON
app.use(express.json());

// --- Rota de Teste ---
app.get("/", (req, res) => {
  res.send('Servidor "Who IA" está no ar! 🔥');
});

// *Todas as rotas em 'authRouter' começarão com '/auth'

app.use("/auth", authRouter);
app.use("/company", companyRouter);
app.use("/data", dataRouter);
app.use("/dashboard", dashboardRouter);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});
