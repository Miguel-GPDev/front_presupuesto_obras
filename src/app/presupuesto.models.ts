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
  empresa: EmpresaEmisora;
  cliente: Cliente;
  capitulos: Capitulo[];
  total: number;
}


export interface EmpresaEmisora {
  nombre: string;
  nif: string;
  email: string;
  telefono: string;
  direccion: string;
  logo?: string;
}

export interface Cliente {
  nombre: string;
  nif: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
  };
}
