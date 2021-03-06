import { Component, OnInit, ViewChild, ApplicationRef, NgZone, NgModule } from '@angular/core';
import { FormularioBase } from 'src/app/shared/pages/formularioBase';
import { Deferred } from 'ts-deferred';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MatPaginator, } from '@angular/material/paginator';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { MatSidenav } from '@angular/material/sidenav';
import { EFiltroBandejaSolicitud } from 'src/app/shared/models/fisics/EFiltroBandejaSolicitud';
import { MasterBandejaService } from 'src/app/shared/services/masterbandeja.service';
import { SpinnerVisibilityService } from 'ng-http-loader';
import { ExcelService } from 'src/app/shared/services/excel.service';
import { SolicitudesService } from 'src/app/shared/services/solicitudes.service';
import { Lookup } from 'src/app/shared/models/fisics/base/Lookup';
import { PagedItemCollection } from '@pnp/sp/items';
import { merge, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { EBandejaSolicitud } from 'src/app/shared/models/fisics/EBandejaSolicitud';
import { MasterLogic } from 'src/app/shared/models/logics/MasterLogic';
import { Variables } from 'src/app/shared/variables';
import { Funciones } from 'src/app/shared/funciones';
import { MasterService } from 'src/app/shared/services/master.service';
import { MasterBandejaLogic } from 'src/app/shared/models/logics/MasterBandejaLogic';

declare var $: any;

@Component({
  selector: 'app-missolicitudespendientes',
  templateUrl: './missolicitudespendientes.component.html',
  styleUrls: ['./missolicitudespendientes.component.scss']
})
export class MissolicitudespendientesComponent extends FormularioBase implements OnInit {
  currentUserName: string = '';
  userSolicitante: boolean = false;
  datosMaestrosBandeja: MasterBandejaLogic = new MasterBandejaLogic();
  tableQuery: any = {
    order: "",
    direction: "",
    pagesize: 5,
    limit: this.obtenerParametro("limit") || 5,
    page: this.obtenerParametro("page") || 1,
    filter: this.obtenerParametro("filter") || new EFiltroBandejaSolicitud()
  };

  isOpenMenu: boolean = false;
  promise: Promise<void>;

  solicitudes: EBandejaSolicitud[] = [];
  solicitudes_paged: PagedItemCollection<any[]>;
  solicitudes_paged_history: PagedItemCollection<any[]>[];
  page_last: number = -1;
  itemCount: number;

  dataSourceSolicitudes: EBandejaSolicitud[] = [];
  displayedColumnsSolicitud: string[] = [
    Variables.columnasSolicitud.Id,
    Variables.columnasSolicitud.Author,
    Variables.columnasSolicitud.Created,
    Variables.columnasSolicitud.NombreTitular,
    Variables.columnasSolicitud.NumeroDocumento,
    Variables.columnasSolicitud.TipoProducto,
    Variables.columnasSolicitud.Estado,
    Variables.columnasSolicitud.Moneda,
    Variables.columnasSolicitud.PrecioVenta,
    Variables.columnasSolicitud.Financiamiento,
    Variables.columnasSolicitud.Oficina,
    Variables.columnasSolicitud.FechaEstado
  ];
  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  isFilterApplied = false;

  nombreControles = {
    filtroSolicitante: 'filtroSolicitante'
  }

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('sidenavfiltros', { static: true }) public myNav: MatSidenav;

  constructor(
    public applicationRef: ApplicationRef,
    public dialog: MatDialog,
    public route: ActivatedRoute,
    public router: Router,
    public masterService: MasterService,
    public masterbandejaService: MasterBandejaService,
    public zone: NgZone,
    public _spinner: SpinnerVisibilityService,
    public solicitudesService: SolicitudesService,
    public excelService: ExcelService,
    public formBuilder: FormBuilder
  ) {
    super('Mis Solicitudes Pendientes', applicationRef, dialog, route, router, masterService, zone, _spinner);

    this.form = this.formBuilder.group({
      filtroSolicitante: ['']
    });
  }

  ngOnInit(): void {
    this.mostrarProgreso();
    this.obtenerMaestrosYDatos().then(() => {

      this.currentUserName = this.datosMaestrosBandeja.currentUser.Title;
      this.userSolicitante = this.datosMaestrosBandeja.PertenceGrupo_U_Oficina;

      if (this.datosMaestrosBandeja.PertenceGrupo_U_ReemplazoOficina) {
        this.userSolicitante = false;
      }

      this.datosMaestrosBandeja.maestroEstado = this.datosMaestrosBandeja.maestroEstado.filter((elementoEstado: Lookup) => {
        return elementoEstado.Id === 1 || elementoEstado.Id === 3 || elementoEstado.Id === 5;
      });

      let order: string;

      if (this.obtenerParametro("order")) {
        order = (this.obtenerParametro("desc") ? "-" : "") + this.obtenerParametro("order");
      } else {
        order = "-Modified";
      }

      order = "Id";

      this.tableQuery = {
        order: order,
        direction: "",
        pagesize: 5,
        limit: this.obtenerParametro("limit") || 5,
        page: this.obtenerParametro("page") || 1,
        filter: this.obtenerParametro("filter") || new EFiltroBandejaSolicitud()
      };

      if (this.tableQuery.filter) this.isOpenMenu = true;

      this.setearFiltrosBusquedaPorEstado();

      this.getTablePagination();
      this.ocultarProgreso();
    },
      err => this.guardarLog(err)
    ).catch(error => {
      this.mostrarModalError("obtenerMaestrosYDatos", error);
    });

  }

  private setearFiltrosBusquedaPorEstado() {
    let visFilterApplied = window.sessionStorage.getItem("NombreTitular");

    if (visFilterApplied) {
      this.isFilterApplied = visFilterApplied == "1" ? true : false;
    }

    if (!this.isFilterApplied) {
      let estadosSeleccionados: number[] = [];

      estadosSeleccionados = this.datosMaestrosBandeja.maestroEstado.filter((elementoEstado: Lookup) => {
        return elementoEstado.Id === 1 || elementoEstado.Id === 3 || elementoEstado.Id === 5;
      }).map((elementoEstado: Lookup) => elementoEstado.Id);

      this.tableQuery.filter.Estado = estadosSeleccionados;
    }
  }

  cargarDatosPagina() {
    this.mostrarProgreso();

    this.obtenerMaestrosYDatos().then(
      () => {
        this.currentUserName = this.datosMaestrosBandeja.currentUser.Title;
        this.ocultarProgreso();
      },
      err => this.guardarLog(err)
    );
  }

  obtenerMaestrosYDatos(): Promise<boolean> {
    this.mostrarProgreso();
    const d: Deferred<boolean> = new Deferred<boolean>();

    this.masterbandejaService.getDatosMaestros().subscribe((masterBandejaLogic: MasterBandejaLogic) => {
      if (masterBandejaLogic.isDatos) {
        this.datosMaestrosBandeja = masterBandejaLogic;
        this.ocultarProgreso();
        d.resolve(true);
      }
    });

    return d.promise;
  }

  public irPaginaExterna(
    nombrePagina: string,
    parametroQueryString: string,
    valorQueryString: string
  ) {
    const url = environment.getRutaBaseApp() + nombrePagina + '?' + parametroQueryString + '=' + valorQueryString;
    window.open(url, '_blank');
  }

  reload() {
    this.getSolicitudes()
  }

  openSidenavMenu() {
    this.myNav.toggle();
    $('.my-left-sidenav').show();
    this.openMenu()
  };

  closeSidenavMenu() {
    this.myNav.toggle();
    $('.my-left-sidenav').hide();
  }

  openMenu() {
    this.isOpenMenu = true;
  }

  closeMenu() {
    this.isOpenMenu = false;
  }

  onKeydownNombreTitular(event) {
    /*if (event.key === "Enter") {
      this.closeSidenavMenu();
      this.getSolicitudes();
    }*/
  }

  limpiar(orden: string = "") {
    let order = "Id";

    if (orden) {
      order = orden;
    }

    this.tableQuery = {
      order,
      limit: this.obtenerParametro("limit") || 10,
      page: this.obtenerParametro("page") || 1,
      filter: this.obtenerParametro("filter") || new EFiltroBandejaSolicitud()
    };

    if (this.tableQuery.filter) this.isOpenMenu = true;

    this.removePeople("solicitante");
    this.setearFiltrosBusquedaPorEstado();

    this.getSolicitudes();

    this.setClearFiltrosAplicados();
  }

  setClearFiltrosAplicados() {
    window.sessionStorage.setItem("NombreTitular", "");
    window.sessionStorage.setItem("Estado", "");
    window.sessionStorage.setItem("NumeroDocumento", "");
    window.sessionStorage.setItem("TipoProducto", "");
    window.sessionStorage.setItem("Oficina", "");

    this.isFilterApplied = false;
  }

  async getSolicitudes() {
    this.paginator.pageIndex = 0;
    this.page_last = -1
    this.setFiltrosSession();
    this.getTablePagination();
    this.closeSidenavMenu();
  }

  setFiltrosSession() {
    window.sessionStorage.setItem("NombreTitular", this.tableQuery.filter.NombreTitular);
    window.sessionStorage.setItem("Estado", this.tableQuery.filter.Estado);
    window.sessionStorage.setItem("NumeroDocumento", this.tableQuery.filter.NumeroDocumento);
    window.sessionStorage.setItem("TipoProducto", this.tableQuery.filter.TipoProducto);
    window.sessionStorage.setItem("Oficina", this.tableQuery.filter.Oficina);

    this.isFilterApplied = true;
  }

  getTablePagination() {
    this.mostrarProgreso();

    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.getSolicitudesPaged();
        }),
        map(data => {

          this.isLoadingResults = false;
          this.isRateLimitReached = false;
          let vResultsLength = ((this.paginator.pageIndex + 1) * this.paginator.pageSize);
          let vResultsLengthTmp = this.resultsLength;
          if (this.resultsLength < vResultsLength) {
            this.resultsLength = vResultsLength;
          }
          if (data.length < this.paginator.pageSize) {
            vResultsLength = this.resultsLength - (this.paginator.pageSize - data.length);
            this.resultsLength = vResultsLength;
          }
          if (this.solicitudes_paged.hasNext) {
            if (vResultsLengthTmp < vResultsLength) {
              this.resultsLength = this.resultsLength + 1;
            }
          }
          this.ocultarProgreso();
          return data;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          this.isRateLimitReached = true;
          return observableOf([]);
        })
      ).subscribe(data => {
        this.ocultarProgreso();
        this.dataSourceSolicitudes = data;
      });
  }

  async getSolicitudesPaged(): Promise<EBandejaSolicitud[]> {
    this.mostrarProgreso();

    this.tableQuery.filter.Author = this.getValorControlPeoplePicker(this.nombreControles.filtroSolicitante);

    if (this.tableQuery.filter.Estado.length === 0) {
      let estadosSeleccionados: number[] = [];

      estadosSeleccionados = this.datosMaestrosBandeja.maestroEstado.filter((elementoEstado: Lookup) => {
        return elementoEstado.Id === 1 || elementoEstado.Id === 3 || elementoEstado.Id === 5;
      }).map((elementoEstado: Lookup) => elementoEstado.Id);

      this.tableQuery.filter.Estado = estadosSeleccionados;
    }

    let filter = this.tableQuery.filter;
    let order = this.sort.active;
    let desc = this.sort.direction;

    let direction = true;

    if (desc == "asc") {
      direction = true;
    } else if (desc == "desc") {
      direction = false;
    } else {
      order = null;
    }

    if (this.paginator.pageIndex == 0 || this.tableQuery.order != order || this.tableQuery.direction != desc || this.tableQuery.pagesize != this.paginator.pageSize) {

      this.tableQuery.order = order;
      this.tableQuery.direction = desc;
      this.tableQuery.pagesize = this.paginator.pageSize;

      this.solicitudes_paged_history = [];

      this.solicitudes_paged = await this.solicitudesService.getBandejaMisSolicitudesPendientes(filter, order, direction, this.paginator.pageSize, this.datosMaestrosBandeja.currentUser, this.userSolicitante).then();

    } else {

      if (this.solicitudes_paged_history[this.paginator.pageIndex]) {
        this.solicitudes_paged = await this.solicitudes_paged_history[this.paginator.pageIndex - 1].getNext();
      } else {
        if (this.paginator.pageIndex > this.page_last) {
          if (this.solicitudes_paged.hasNext) {
            this.solicitudes_paged = await this.solicitudes_paged.getNext();
          }
        }
      }
    }

    this.page_last = this.paginator.pageIndex;

    if (!this.solicitudes_paged_history[this.paginator.pageIndex]) {
      this.solicitudes_paged_history[this.paginator.pageIndex] = this.solicitudes_paged;
    }

    const items: EBandejaSolicitud[] = this.solicitudes_paged.results.map(elemento => {
      return EBandejaSolicitud.parseJson(elemento);
    });

    this.ocultarProgreso();
    return items;
  }

  removePeople(tipoControl: string): void {

    if (tipoControl === 'solicitante') {
      this.form.get(this.nombreControles.filtroSolicitante).setValue([]);
      this.form.controls[this.nombreControles.filtroSolicitante].updateValueAndValidity();
    }
  }

  exportarExcel() {
    this.mostrarProgreso();

    this.tableQuery.filter.Author = this.getValorControlPeoplePicker(this.nombreControles.filtroSolicitante);

    if (this.tableQuery.filter.Estado.length === 0) {
      this.setearFiltrosBusquedaPorEstado();
    }

    let filter = this.tableQuery.filter;
    let order = this.sort.active;
    let desc = this.sort.direction;

    let direction = true;

    if (desc == "asc") {
      direction = true;
    } else if (desc == "desc") {
      direction = false;
    } else {
      order = null;
    }

    this.solicitudesService.getBandejaMisSolicitudesPendientes(filter, order, direction, 100000, this.datosMaestrosBandeja.currentUser, this.userSolicitante).then(
      (data: PagedItemCollection<any[]>) => {
        const items: EBandejaSolicitud[] = data.results.map(elemento => {
          return EBandejaSolicitud.parseJson(elemento);
        });

        const headers: string[] = ['N° Solicitud', 'Solicitante', 'Fec. Solicitud', 'Nombre Titular', 'Nro. Documento', 'Tipo Producto', 'Estado', 'Moneda', 'Precio Venta', 'Financiamiento', 'Oficina', 'Fecha Estado'];
        const details: any[][] = items.map((item: any) => {
          const dataMap: any[] = [];

          dataMap.push(item.Id);
          dataMap.push(item.Author);
          dataMap.push(Funciones.dateFormat(item.Created));
          dataMap.push(item.Nombre_Titular);
          dataMap.push(item.N_Documento);
          dataMap.push(item.Tipo_Producto);
          dataMap.push(item.Estado);
          dataMap.push(item.Moneda);
          dataMap.push(item.Precio_Venta);
          dataMap.push(item.Financiamiento);
          dataMap.push(item.Oficina);
          dataMap.push(item.Fecha_Estado);

          return dataMap;
        });
       
        this.excelService.excelListadoMisSolicitudes('Mis Solicitudes Pendientes', 'MisSolicitudesPendientes', headers, details);
        this.ocultarProgreso();
      },
      err => this.guardarLog(err)
    );

  }
}

export interface IDictionary {
  [key: number]: PagedItemCollection<any[]>;
};