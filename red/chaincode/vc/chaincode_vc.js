//Necesario para Node Fabric Shim
const shim = require('fabric-shim');
const util = require('util');
const ClientIdentity = require('fabric-shim').ClientIdentity;
//Importamos las estructuras de datos para los assets
const assets = require('./assets_vc');
//Extras
const uuidv1 = require('uuid/v1');

//Definimos una clase de tipo Chaincode
var Chaincode = class {

        //Esta función implementa la interfaz de Chaincode y se ejecuta cada vez que se instancia o se hace upgrade del chaincode
        async Init(stub) {

                //En este caso no necesitamos pre-cargar nada en el world state u operaciones de inicialización    
                //Retorna el código de ejecución 200 a Fabric (Todo salió bien)
                return shim.success();
        }

        //Esta funcion implementa la interfaz de Chaincode y se ejecuta cada vez que invocamos el chaincode
        async Invoke(stub) {
                
                //Verificamos que se haya invocado al chaincode con algún parametro
                if(stub.getArgs().length == 0){

                        //Retorna a Fabric indicando que el chaincode no se ejecutó con éxito
                        return shim.error("El chaincode fue invocado con parámetros insuficientes");  
                }

                //Obtenemos el nombre de la función a invocar y sus argumentos
                var ret = stub.getFunctionAndParameters();
                //La documentacion dice que devuelve un array de String pero devuelve un Object
                var params_legth = Object.keys(ret.params).length
                let cid = new ClientIdentity(stub);
                console.log("Funcion y parametros", ret);
                console.log("ID", cid.getID());
                console.log("MSP ID", cid.getMSPID());
                switch(ret.fcn){

                        case("crearFactura"):
                                //Veamos que tengamos los argumentos necesarios para esta función
                                console.log("Parámetros de crearFactura", ret.params);
                                if(params_legth!=4){
                                    return shim.error("La función crearFactura fue invocada con parámetros insuficientes");
                                }

                                try {
                                        let retorno = await this.crearFactura(stub,ret.params[0],ret.params[1],ret.params[2],ret.params[3]);  
                                        return shim.success(retorno); 
                                } catch (error) {
                                        return shim.error("Sucedio un error inesperado y no se guardó la información: "+error);  
                                }
                                
                                break;
                        case("pagarFactura"):
                                
                                console.log("Tipo de objeto", typeof(ret.params));
                                console.log("Cuenta de parametros", params_legth);

                                if(params_legth!=1){
                                    console.log("Parametros de pagarFactura", ret.params);
                                    return shim.error("La función pagarFactura fue invocada con parámetros insuficientes");
                                 }

                                try {
                                        let retorno = await this.pagarFactura(stub,ret.params[0]);  
                                        return shim.success(retorno); 
                                } catch (error) {
                                        return shim.error("Sucedio un error inesperado y no se guardó la información: "+error); 
                                }
                
                                break;
                        default:
                                return shim.error("La función a invocar no existe en el chaincode");
                }

        }

        async pagarFactura(stub, id_factura) {

                //TODO: Verificar que la identidad de quien invoca es la misma que paga
                let oempresa_deudora;

                //TODO: Verificar que pasa si no lo encuentra (error o string nula)
                let factura = JSON.parse(await stub.getState(id_factura));

                //Verificamos que la empresa que paga tenga dinero suficiente
                if(oempresa_deudora.dinero < monto){
                        throw "La empresa deudora no tiene fondos suficientes";
                }

                //Verificamos que la factura no haya sido pagada
                if(factura.estado === "PAGA"){
                         throw "La factura ya está paga";
                }

                //Cargamos la empresa emisora
                let oempresa_emisora = JSON.parse(await stub.getState(factura.emisor));

                //Hacemos el cambio de dinero de una empresa a otra
                oempresa_emisora.dinero += factura.monto;
                oempresa_deudora.dinero -= factura.monto;
                factura.estado = "PAGA";

                //Guardamos la factura paga y las empresas modificadas
                await stub.putState(factura.id_factura, Buffer.from(JSON.stringify(oempresa_deudora)));
                await stub.putState(factura.id_factura, Buffer.from(JSON.stringify(oempresa_emisora)));
                await stub.putState(factura.id_factura, Buffer.from(JSON.stringify(factura)));
                
                return Buffer.from(JSON.stringify(factura));
        }

        async crearFactura(stub, id_contenedor, emisor, deudor, monto){
                
                //Creamos una nueva factura
                let id_factura = uuidv1();
                let factura = assets.factura(id_factura, id_contenedor, emisor, deudor, monto);
                let payload = JSON.stringify(factura);

                //Guardamos el contenedor en el world state
                await stub.putState(id_contenedor, Buffer.from(payload));    
                return Buffer.from(payload);
        }
};

//Esta funcion ejecuta el proceso del chaincode
shim.start(new Chaincode());