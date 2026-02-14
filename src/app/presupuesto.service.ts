import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Presupuesto } from './presupuesto.models';

@Injectable({ providedIn: 'root' })
export class PresupuestoService {
  private readonly apiUrl = `${environment.apiBaseUrl}/presupuestos`;

  constructor(private readonly http: HttpClient) {}

  crearPresupuesto(payload: Presupuesto): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(this.apiUrl, payload);
  }
}
