import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PresupuestoService } from './presupuesto.service';
import { AuthResponse, Capitulo, Cliente, EmpresaEmisora, Partida, Presupuesto } from './presupuesto.models';

type Vista = 'login' | 'home' | 'editor';
type AuthModo = 'login' | 'register';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly vista = signal<Vista>('login');
  readonly authModo = signal<AuthModo>('login');
  readonly mostrandoPreview = signal(false);

  readonly token = signal('');
  readonly usuarioNombre = signal('');
  readonly presupuestoActualId = signal<string | null>(null);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly authError = signal('');

  readonly presupuestos = signal<Presupuesto[]>([]);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.group({
    nombre: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly form = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    empresa: this.fb.group({
      nombre: ['', Validators.required],
      nif: [''],
      email: ['', Validators.email],
      telefono: [''],
      direccion: [''],
      logo: ['']
    }),
    cliente: this.fb.group({
      nombre: ['', Validators.required],
      nif: [''],
      email: ['', Validators.email],
      telefono: [''],
      direccion: ['']
    }),
    ivaPorcentaje: [21, [Validators.min(0), Validators.max(100)]],
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


  readonly totalConIva = computed(() => {
    const iva = Number(this.form.value.ivaPorcentaje ?? 0);
    return this.totalGeneral() * (1 + iva / 100);
  });


  readonly opcionesUnidad = [
    { valor: 'm2', etiqueta: 'Metros cuadrados (m²)', precioBase: 35 },
    { valor: 'u', etiqueta: 'Unidades (u)', precioBase: 18 },
    { valor: 'ml', etiqueta: 'Metros lineales (ml)', precioBase: 14 },
    { valor: 'm3', etiqueta: 'Metros cúbicos (m³)', precioBase: 52 },
    { valor: 'kg', etiqueta: 'Kilogramos (kg)', precioBase: 4.8 },
    { valor: 'h', etiqueta: 'Horas (h)', precioBase: 28 },
    { valor: 'l', etiqueta: 'Litros (l)', precioBase: 3.2 },
    { valor: 'jor', etiqueta: 'Jornadas (jor)', precioBase: 180 }
  ] as const;

  private readonly precioBasePorUnidad: Record<string, number> = this.opcionesUnidad.reduce((acc, item) => {
    acc[item.valor] = item.precioBase;
    return acc;
  }, {} as Record<string, number>);

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


  actualizarPrecioPorUnidad(indexCapitulo: number, indexPartida: number): void {
    const partida = this.partidas(indexCapitulo).at(indexPartida);
    const unidad = String(partida.get('unidadMedida')?.value ?? 'u');
    const precioBase = this.precioBasePorUnidad[unidad] ?? 0;
    partida.get('precio')?.setValue(precioBase);
  }


  autoResize(evento: Event): void {
    const area = evento.target as HTMLTextAreaElement;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }

  cambiarAuthModo(modo: AuthModo): void {
    this.authModo.set(modo);
    this.authError.set('');
  }

  probarRapido(): void {
    this.token.set('');
    this.usuarioNombre.set('Invitado');
    this.presupuestoActualId.set(null);
    this.authError.set('');
    this.error.set('');
    this.mensaje.set('Modo prueba activo: puedes crear y editar sin enviar al backend.');
    this.reiniciarFormularioPresupuesto();
    this.vista.set('editor');
  }

  estaAutenticado(): boolean {
    return Boolean(this.token());
  }

  logoEmpresa(): string {
    return this.form.value.empresa?.logo ?? '';
  }

  onLogoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.error.set('El logo debe ser una imagen válida.');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result ?? '');
      this.form.get('empresa.logo')?.setValue(resultado);
      this.error.set('');
    };
    lector.readAsDataURL(archivo);
  }

  previsualizarPdf(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }
    this.mostrandoPreview.set(true);
  }

  cerrarPreview(): void {
    this.mostrandoPreview.set(false);
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.authError.set('');
    this.error.set('');

    this.presupuestoService
      .login({
        email: this.loginForm.value.email ?? '',
        password: this.loginForm.value.password ?? ''
      })
      .subscribe({
        next: (respuesta) => this.onAuthOk(respuesta),
        error: () => {
          this.authError.set('No se pudo iniciar sesión. Verifica credenciales.');
          this.cargando.set(false);
        }
      });
  }

  registrarse(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.authError.set('');

    this.presupuestoService
      .registro({
        nombre: this.registerForm.value.nombre ?? '',
        email: this.registerForm.value.email ?? '',
        password: this.registerForm.value.password ?? ''
      })
      .subscribe({
        next: (respuesta) => this.onAuthOk(respuesta),
        error: () => {
          this.authError.set('No se pudo registrar el usuario. Revisa los datos e inténtalo de nuevo.');
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
    this.authModo.set('login');
    this.loginForm.reset();
    this.registerForm.reset();
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
    if (!this.token() || !id) {
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
    this.actualizarPrecioPorUnidad(this.capitulos.length - 1, 0);
  }

  eliminarCapitulo(indexCapitulo: number): void {
    if (this.capitulos.length === 1) {
      return;
    }
    this.capitulos.removeAt(indexCapitulo);
  }

  agregarPartida(indexCapitulo: number): void {
    this.partidas(indexCapitulo).push(this.crearPartida());
    this.actualizarPrecioPorUnidad(indexCapitulo, this.partidas(indexCapitulo).length - 1);
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

    if (!this.token()) {
      this.error.set('');
      this.mensaje.set('Borrador local guardado en modo prueba. Inicia sesión para enviarlo al backend.');
      return;
    }

    const payload: Presupuesto = {
      id: this.presupuestoActualId() ?? undefined,
      nombre: this.form.value.nombre ?? '',
      descripcion: this.form.value.descripcion ?? '',
      empresa: {
        nombre: this.form.value.empresa?.nombre ?? '',
        nif: this.form.value.empresa?.nif ?? '',
        email: this.form.value.empresa?.email ?? '',
        telefono: this.form.value.empresa?.telefono ?? '',
        direccion: this.form.value.empresa?.direccion ?? '',
        logo: this.form.value.empresa?.logo ?? ''
      } as EmpresaEmisora,
      cliente: {
        nombre: this.form.value.cliente?.nombre ?? '',
        nif: this.form.value.cliente?.nif ?? '',
        email: this.form.value.cliente?.email ?? '',
        telefono: this.form.value.cliente?.telefono ?? '',
        direccion: this.form.value.cliente?.direccion ?? ''
      } as Cliente,
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
      total: this.totalGeneral(),
      ivaPorcentaje: Number(this.form.value.ivaPorcentaje ?? 0),
      totalConIva: this.totalConIva()
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

  private onAuthOk(respuesta: AuthResponse): void {
    this.token.set(respuesta.token);
    this.usuarioNombre.set(respuesta.usuario.nombre);
    this.vista.set('home');
    this.authError.set('');
    this.cargando.set(false);
    this.cargarPresupuestos();
  }

  private reiniciarFormularioPresupuesto(): void {
    this.form.reset({
      nombre: '',
      descripcion: '',
      empresa: { nombre: '', nif: '', email: '', telefono: '', direccion: '', logo: '' },
      cliente: { nombre: '', nif: '', email: '', telefono: '', direccion: '' },
      ivaPorcentaje: 21
    });
    this.capitulos.clear();
    this.agregarCapitulo();
  }

  private cargarFormularioDesdePresupuesto(presupuesto: Presupuesto): void {
    this.form.patchValue({
      nombre: presupuesto.nombre,
      descripcion: presupuesto.descripcion,
      empresa: presupuesto.empresa ?? { nombre: '', nif: '', email: '', telefono: '', direccion: '', logo: '' },
      cliente: presupuesto.cliente ?? { nombre: '', nif: '', email: '', telefono: '', direccion: '' },
      ivaPorcentaje: Number(presupuesto.ivaPorcentaje ?? 21)
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
      unidadMedida: [partida.unidadMedida || 'u', Validators.required],
      cantidad: [partida.cantidad, [Validators.required, Validators.min(0)]],
      precio: [partida.precio, [Validators.required, Validators.min(0)]]
    });
  }

  private partidaVacia(): Partida {
    return {
      descripcion: '',
      unidadMedida: 'u',
      cantidad: 0,
      precio: this.precioBasePorUnidad['u'],
      total: 0
    };
  }
}
