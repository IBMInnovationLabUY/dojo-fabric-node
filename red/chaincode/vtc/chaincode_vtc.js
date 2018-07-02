//Necesario para Node Fabric Shim
const shim = require('fabric-shim');
const util = require('util');
const ClientIdentity = require('fabric-shim').ClientIdentity;
//Importamos las estructuras de datos para los assets
const assets = require('./assets_vtc');
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
                        //Si el nombre de la función es transferirCarga
                        case("transferirCarga"):
                                //Veamos que tengamos los argumentos necesarios para esta función
                                console.log("Parametros de transferir carga", ret.params);
                                if(params_legth!=2){
                                    return shim.error("La función transferirCarga fue invocada con parámetros insuficientes");
                                }

                                try {
                                        let retorno = await this.transferirCarga(stub,ret.params[0],ret.params[1]);  
                                        return shim.success(retorno); 
                                } catch (error) {
                                        return shim.error("Sucedio un error inesperado y no se guardó la información: "+error);  
                                }
                        
                                break;
                        case("crearContenedor"):
                                
                                console.log("Tipo de objeto", typeof(ret.params));
                                console.log("Cuenta de parametros", params_legth);

                                if(params_legth!=3){
                                    console.log("Parametros de crear contenedor", ret.params);
                                    return shim.error("La función crearContenedor fue invocada con parámetros insuficientes");
                                 }

                                try {
                                        let retorno = await this.crearContenedor(stub,ret.params[0],ret.params[1],ret.params[2]);  
                                        return shim.success(retorno); 
                                } catch (error) {
                                        return shim.error("Sucedio un error inesperado y no se guardó la información: "+error); 
                                }
                
                                break;
                        default:
                                return shim.error("La función a invocar no existe en el chaincode");
                }

        }

        //Función para transferir carga
        async transferirCarga(stub, carga, hacia) {

                //Fabric utiliza un almacenamiento de tipo Key-Value, acceder a los datos se hace de manera asíncrona devolviendo un Promise
                
                //Se asume que el activo se encuentra en el world state ya que sabemos su idActivo asi que obtenemos el objeto para modificar
                let value = await stub.getState(carga);

                //Deserializamos el objeto ContainerJuguetes
                let container_juguete = JSON.parse(value)
                
                /*
                //Solo puedo recibir la carga si no está en mi depósito por esta razón veo la identidad de quien invocó el chaincode
                //Si las identidades son distintas puedo marcar como recibido
                let cid = new ClientIdentity(stub);

                //Concatenamos el ID unico del MSP en la red mas el ID unico del participante en ese MSP
                //Esto es porque tenemos un MSP por organización, sino podriamos utilizar solo getID()
                if(cid.getMSPID()+cid.getID() === container_juguete.empresa_almacenado){
                        return shim.error("Usted no puede recibir este envió, es el propietario actual del mismo");
                } */

                if(container_juguete.empresa_almacenado == container_juguete.empresa_destino){
                        return shim.error("El envío ya se encuentra en destino");
                }

                //Actualizamos donde se encuentra el contenedor en el recorrido y su estado
                container_juguete.empresa_almacenado = hacia;

                if(container_juguete.empresa_almacenado == container_juguete.empresa_destino){
                   container_juguete.estado = "EN DESTINO"
                }
                
                //Serializamos el objeto modificado
                let payload = JSON.stringify(container_juguete)

                //Guardamos el nuevo world state
                await stub.putState(carga, Buffer.from(payload));  
                return Buffer.from(payload); 

        }

        async crearContenedor(stub, descripcion, origen, destino){
                //Creamos un nuevo contenedor de jugetes
                let id_contenedor = uuidv1();
                let contenedor = assets.container_juguetes(id_contenedor, descripcion, origen, destino, origen);
                let payload = JSON.stringify(contenedor);

                //Guardamos el contenedor en el world state
                await stub.putState(id_contenedor, Buffer.from(payload));    
                return Buffer.from(payload);
        }
};

//Esta funcion ejecuta el proceso del chaincode
shim.start(new Chaincode());