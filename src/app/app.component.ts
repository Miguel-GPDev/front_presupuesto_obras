import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PresupuestoService } from './presupuesto.service';
import { Capitulo, Partida, Presupuesto } from './presupuesto.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    capitulos: this.fb.array([])
  });

  readonly totalGeneral = computed(() =>
    this.capitulos.controls.reduce((acumulado, capitulo) => {
      const partidas = capitulo.get('partidas') as FormArray<FormGroup>;
      const totalCapitulo = partidas.controls.reduce((suma, partida) => {
        const cantidad = Number(partida.get('cantidad')?.value ?? 0);
        const precio = Number(partida.get('precio')?.value ?? 0);
        return suma + cantidad * precio;
      }, 0);
      return acumulado + totalCapitulo;
    }, 0)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly presupuestoService: PresupuestoService
  ) {
    this.agregarCapitulo();
  }

  get capitulos(): FormArray<FormGroup> {
    return this.form.get('capitulos') as FormArray<FormGroup>;
  }

  partidas(indexCapitulo: number): FormArray<FormGroup> {
    return this.capitulos.at(indexCapitulo).get('partidas') as FormArray<FormGroup>;
  }

  agregarCapitulo(): void {
    this.capitulos.push(
      this.fb.group({
        nombre: ['', Validators.required],
        referencia: ['', Validators.required],
        descripcion: [''],
        partidas: this.fb.array([this.crearPartida()])
      })
    );
  }

  eliminarCapitulo(indexCapitulo: number): void {
    if (this.capitulos.length === 1) {
      return;
    }
    this.capitulos.removeAt(indexCapitulo);
  }

  agregarPartida(indexCapitulo: number): void {
    this.partidas(indexCapitulo).push(this.crearPartida());
  }

  eliminarPartida(indexCapitulo: number, indexPartida: number): void {
    const partidas = this.partidas(indexCapitulo);
    if (partidas.length === 1) {
      return;
    }
    partidas.removeAt(indexPartida);
  }

  totalPartida(indexCapitulo: number, indexPartida: number): number {
    const partida = this.partidas(indexCapitulo).at(indexPartida);
    const cantidad = Number(partida.get('cantidad')?.value ?? 0);
    const precio = Number(partida.get('precio')?.value ?? 0);
    return cantidad * precio;
  }

  totalCapitulo(indexCapitulo: number): number {
    return this.partidas(indexCapitulo).controls.reduce((suma, _, indexPartida) => {
      return suma + this.totalPartida(indexCapitulo, indexPartida);
    }, 0);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Presupuesto = {
      nombre: this.form.value.nombre ?? '',
      descripcion: this.form.value.descripcion ?? '',
      capitulos: this.capitulos.controls.map((capituloForm, indexCapitulo): Capitulo => ({
        nombre: capituloForm.value.nombre ?? '',
        referencia: capituloForm.value.referencia ?? '',
        descripcion: capituloForm.value.descripcion ?? '',
        partidas: this.partidas(indexCapitulo).controls.map((partidaForm, indexPartida): Partida => ({
          descripcion: partidaForm.value.descripcion ?? '',
          unidadMedida: partidaForm.value.unidadMedida ?? '',
          cantidad: Number(partidaForm.value.cantidad ?? 0),
          precio: Number(partidaForm.value.precio ?? 0),
          total: this.totalPartida(indexCapitulo, indexPartida)
        })),
        total: this.totalCapitulo(indexCapitulo)
      })),
      total: this.totalGeneral()
    };

    this.guardando.set(true);
    this.mensaje.set('');
    this.error.set('');

    this.presupuestoService.crearPresupuesto(payload).subscribe({
      next: () => {
        this.mensaje.set('Presupuesto creado correctamente.');
        this.guardando.set(false);
      },
      error: () => {
        this.error.set('No se pudo guardar el presupuesto. Revisa la conexión con el backend.');
        this.guardando.set(false);
      }
    });
  }

  private crearPartida(): FormGroup {
    return this.fb.group({
      descripcion: ['', Validators.required],
      unidadMedida: ['', Validators.required],
      cantidad: [0, [Validators.required, Validators.min(0)]],
      precio: [0, [Validators.required, Validators.min(0)]]
    });
  }
}
