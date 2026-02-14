export interface Partida {
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface Capitulo {
  nombre: string;
  referencia: string;
  descripcion: string;
  partidas: Partida[];
  total: number;
}

export interface Presupuesto {
  nombre: string;
  descripcion: string;
  capitulos: Capitulo[];
  total: number;
}
