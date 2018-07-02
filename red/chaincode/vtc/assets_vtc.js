exports.empresa = function(id, nombre, dinero){

    //Creamos un objeto para representar la información
    var empresa =  new Object();

    empresa.id = id;
    empresa.nombre = nombre;
    empresa.dinero = dinero;
    return empresa;
  
}

exports.container_juguetes = function(id_activo, desc, empresa_almacenado, empresa_destino, empresa_origen){
    
    var contenedor = new Object();

    contenedor.id_activo = id_activo;
    contenedor.desc = desc;
    contenedor.estado = "EN TRANSITO"
    contenedor.empresa_almacenado = empresa_almacenado;
    contenedor.empresa_destino = empresa_destino;
    contenedor.empresa_origen = empresa_origen;
    return contenedor;
}

