import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { LoginRequest, LoginResponse, Presupuesto } from './presupuesto.models';

@Injectable({ providedIn: 'root' })
export class PresupuestoService {
  private readonly apiUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, payload);
  }

  crearPresupuesto(payload: Presupuesto, token: string): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(`${this.apiUrl}/presupuestos`, payload, {
      headers: this.crearHeaders(token)
    });
  }

  actualizarPresupuesto(id: string, payload: Presupuesto, token: string): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.apiUrl}/presupuestos/${id}`, payload, {
      headers: this.crearHeaders(token)
    });
  }

  obtenerPresupuestosUsuario(token: string): Observable<Presupuesto[]> {
    return this.http.get<Presupuesto[]>(`${this.apiUrl}/presupuestos/mis`, {
      headers: this.crearHeaders(token)
    });
  }

  obtenerPresupuesto(id: string, token: string): Observable<Presupuesto> {
    return this.http.get<Presupuesto>(`${this.apiUrl}/presupuestos/${id}`, {
      headers: this.crearHeaders(token)
    });
  }

  private crearHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
