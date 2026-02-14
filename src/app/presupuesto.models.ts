export interface Partida {
  id?: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface Capitulo {
  id?: string;
  nombre: string;
  referencia: string;
  descripcion: string;
  partidas: Partida[];
  total: number;
}

export interface Presupuesto {
  id?: string;
  nombre: string;
  descripcion: string;
  capitulos: Capitulo[];
  total: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
  };
}
