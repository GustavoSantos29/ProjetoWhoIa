// Esta é uma "declaração de módulo"
// Esta adicionando uma propriedade à interface Request original do Express
declare namespace Express {
  export interface Request {
    user?: { // A propriedade 'user' é opcional
      id: string;
      email: string;
    };
  }
}