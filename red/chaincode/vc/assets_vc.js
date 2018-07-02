exports.factura = function(id_factura, id_contenedor, emisor, deudor, monto){

    //Creamos un objeto para representar la información
    var factura =  new Object();

    factura.id_factura = id_factura;
    factura.id_contenedor = id_contenedor;
    factura.emisor;
    factura.deudor;
    factura.monto = monto;
    factura.estado = "IMPAGA";
    return factura;
  
}