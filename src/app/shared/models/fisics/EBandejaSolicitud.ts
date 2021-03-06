import { User } from './base/User';
import { Lookup } from './base/Lookup';
import { Variables, SPParse } from '../../variables';

export class EBandejaSolicitud {
    Id: number;
    Author: string;
    Created: Date;
    Nombre_Titular: string;
    Tipo_Documento: string;
    N_Documento: string;
    Tipo_Producto: string;
    Estado: string;
    Moneda: string;
    Precio_Venta: string;
    Modalidad_Pago: string;
    Financiamiento: string;
    Zona: string;
    Oficina: string;
    Sustento_Ingresos: string;
    Fecha_Estado: Date;
    TiempoAtencion: string;

    constructor() {
        this.Id = 0;
        this.Author = "";
        this.Created = new Date();
        this.Nombre_Titular = "";
        this.Tipo_Documento = "";
        this.N_Documento = "";
        this.Tipo_Producto = "";
        this.Estado = "";
        this.Moneda = "";
        this.Precio_Venta = "";
        this.Modalidad_Pago = "";
        this.Financiamiento = "";
        this.Zona = "";
        this.Oficina = "";
        this.Sustento_Ingresos = "";
        this.Fecha_Estado = new Date();
        this.TiempoAtencion = "";
    }

    public static getColumnasSelect(): string[] {
        return [
            Variables.columnasSolicitud.ID,
            Variables.columnasSolicitud.Author + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.Created,
            Variables.columnasSolicitud.NombreTitular,
            Variables.columnasSolicitud.TipoDocumento + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.NumeroDocumento,
            Variables.columnasSolicitud.TipoProducto + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.Estado + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.Moneda + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.PrecioVenta,
            Variables.columnasSolicitud.ModalidadPago + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.Financiamiento,
            Variables.columnasSolicitud.Zona + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.Oficina + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.SustentoIngreso + '/' + Variables.columnasSolicitud.Title,
            Variables.columnasSolicitud.FechaEstado
        ];
    }

    public static getColumnasExpand(): string[] {
        return [
            Variables.columnasSolicitud.Author,
            Variables.columnasSolicitud.TipoDocumento,
            Variables.columnasSolicitud.TipoProducto,
            Variables.columnasSolicitud.Estado,
            Variables.columnasSolicitud.Moneda,
            Variables.columnasSolicitud.ModalidadPago,
            Variables.columnasSolicitud.Zona,
            Variables.columnasSolicitud.Oficina,
            Variables.columnasSolicitud.SustentoIngreso,
        ];
    }

    public static parseJson(elemento: any): EBandejaSolicitud {
        const item = new EBandejaSolicitud();
       
        item.Id = SPParse.getNumber(elemento[Variables.columnasSolicitud.ID]);
        item.Author = User.parseJson(elemento[Variables.columnasSolicitud.Author]).Title;
        item.Created = SPParse.getDate(elemento[Variables.columnasSolicitud.Created]);
        item.Nombre_Titular = SPParse.getString(elemento[Variables.columnasSolicitud.NombreTitular]);
        item.Tipo_Documento = Lookup.parseJson(elemento[Variables.columnasSolicitud.TipoDocumento]).Title;
        item.N_Documento = SPParse.getString(elemento[Variables.columnasSolicitud.NumeroDocumento]);
        item.Tipo_Producto = Lookup.parseJson(elemento[Variables.columnasSolicitud.TipoProducto]).Title;
        item.Estado = Lookup.parseJson(elemento[Variables.columnasSolicitud.Estado]).Title;
        item.Moneda = Lookup.parseJson(elemento[Variables.columnasSolicitud.Moneda]).Title;
        item.Precio_Venta = SPParse.getString(elemento[Variables.columnasSolicitud.PrecioVenta]);
        item.Modalidad_Pago = Lookup.parseJson(elemento[Variables.columnasSolicitud.ModalidadPago]).Title;
        item.Financiamiento = SPParse.getString(elemento[Variables.columnasSolicitud.Financiamiento]);
        item.Zona = Lookup.parseJson(elemento[Variables.columnasSolicitud.Zona]).Title;
        item.Oficina = Lookup.parseJson(elemento[Variables.columnasSolicitud.Oficina]).Title;
        item.Sustento_Ingresos = Lookup.parseJson(elemento[Variables.columnasSolicitud.SustentoIngreso]).Title;
        item.Fecha_Estado = SPParse.getDate(elemento[Variables.columnasSolicitud.FechaEstado]);

        if (item.Financiamiento !== "") {
            item.Financiamiento = Math.round(parseFloat(item.Financiamiento) * 100) + " %"
        }

        return item;
    }

    public static parseJsonList(list: any): EBandejaSolicitud[] {

        let items: EBandejaSolicitud[] = [];

        list.forEach(elemento => {
            const item = EBandejaSolicitud.parseJson(elemento);
            items.push(item);
        });

        return items;
    }
}