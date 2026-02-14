import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PresupuestoService } from './presupuesto.service';
import { Capitulo, LoginResponse, Partida, Presupuesto } from './presupuesto.models';

type Vista = 'login' | 'home' | 'editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly vista = signal<Vista>('login');
  readonly token = signal('');
  readonly usuarioNombre = signal('');
  readonly presupuestoActualId = signal<string | null>(null);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly loginError = signal('');

  readonly presupuestos = signal<Presupuesto[]>([]);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

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
  ) {}

  get capitulos(): FormArray<FormGroup> {
    return this.form.get('capitulos') as FormArray<FormGroup>;
  }

  partidas(indexCapitulo: number): FormArray<FormGroup> {
    return this.capitulos.at(indexCapitulo).get('partidas') as FormArray<FormGroup>;
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.loginError.set('');
    this.error.set('');

    this.presupuestoService
      .login({
        email: this.loginForm.value.email ?? '',
        password: this.loginForm.value.password ?? ''
      })
      .subscribe({
        next: (respuesta: LoginResponse) => {
          this.token.set(respuesta.token);
          this.usuarioNombre.set(respuesta.usuario.nombre);
          this.vista.set('home');
          this.cargando.set(false);
          this.cargarPresupuestos();
        },
        error: () => {
          this.loginError.set('No se pudo iniciar sesión. Verifica credenciales.');
          this.cargando.set(false);
        }
      });
  }

  cerrarSesion(): void {
    this.token.set('');
    this.usuarioNombre.set('');
    this.presupuestos.set([]);
    this.presupuestoActualId.set(null);
    this.vista.set('login');
    this.loginForm.reset();
    this.reiniciarFormularioPresupuesto();
  }

  cargarPresupuestos(): void {
    if (!this.token()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.presupuestoService.obtenerPresupuestosUsuario(this.token()).subscribe({
      next: (lista) => {
        this.presupuestos.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo recuperar la lista de presupuestos.');
        this.cargando.set(false);
      }
    });
  }

  nuevoPresupuesto(): void {
    this.presupuestoActualId.set(null);
    this.reiniciarFormularioPresupuesto();
    this.vista.set('editor');
  }

  abrirPresupuesto(id: string): void {
    if (!this.token()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.presupuestoService.obtenerPresupuesto(id, this.token()).subscribe({
      next: (presupuesto) => {
        this.presupuestoActualId.set(presupuesto.id ?? id);
        this.cargarFormularioDesdePresupuesto(presupuesto);
        this.vista.set('editor');
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo abrir el presupuesto seleccionado.');
        this.cargando.set(false);
      }
    });
  }

  volverAHome(): void {
    this.vista.set('home');
    this.mensaje.set('');
    this.error.set('');
    this.cargarPresupuestos();
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
    if (!this.token()) {
      this.error.set('Debes iniciar sesión para guardar.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Presupuesto = {
      id: this.presupuestoActualId() ?? undefined,
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

    const peticion = this.presupuestoActualId()
      ? this.presupuestoService.actualizarPresupuesto(this.presupuestoActualId() as string, payload, this.token())
      : this.presupuestoService.crearPresupuesto(payload, this.token());

    peticion.subscribe({
      next: (resultado) => {
        if (!this.presupuestoActualId() && resultado.id) {
          this.presupuestoActualId.set(resultado.id);
        }
        this.mensaje.set('Presupuesto guardado correctamente.');
        this.guardando.set(false);
      },
      error: () => {
        this.error.set('No se pudo guardar el presupuesto. Revisa la conexión con el backend.');
        this.guardando.set(false);
      }
    });
  }

  private reiniciarFormularioPresupuesto(): void {
    this.form.reset({ nombre: '', descripcion: '' });
    this.capitulos.clear();
    this.agregarCapitulo();
  }

  private cargarFormularioDesdePresupuesto(presupuesto: Presupuesto): void {
    this.form.patchValue({
      nombre: presupuesto.nombre,
      descripcion: presupuesto.descripcion
    });

    this.capitulos.clear();

    if (!presupuesto.capitulos.length) {
      this.agregarCapitulo();
      return;
    }

    presupuesto.capitulos.forEach((capitulo) => {
      this.capitulos.push(
        this.fb.group({
          nombre: [capitulo.nombre, Validators.required],
          referencia: [capitulo.referencia, Validators.required],
          descripcion: [capitulo.descripcion],
          partidas: this.fb.array(
            (capitulo.partidas.length ? capitulo.partidas : [this.partidaVacia()]).map((partida) =>
              this.fb.group({
                descripcion: [partida.descripcion, Validators.required],
                unidadMedida: [partida.unidadMedida, Validators.required],
                cantidad: [partida.cantidad, [Validators.required, Validators.min(0)]],
                precio: [partida.precio, [Validators.required, Validators.min(0)]]
              })
            )
          )
        })
      );
    });
  }

  private crearPartida(): FormGroup {
    const partida = this.partidaVacia();

    return this.fb.group({
      descripcion: [partida.descripcion, Validators.required],
      unidadMedida: [partida.unidadMedida, Validators.required],
      cantidad: [partida.cantidad, [Validators.required, Validators.min(0)]],
      precio: [partida.precio, [Validators.required, Validators.min(0)]]
    });
  }

  private partidaVacia(): Partida {
    return {
      descripcion: '',
      unidadMedida: '',
      cantidad: 0,
      precio: 0,
      total: 0
    };
  }
}
