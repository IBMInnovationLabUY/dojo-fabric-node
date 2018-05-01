let hfc = require('fabric-client');
let ca = require('fabric-ca-client');
let prompt = require('prompt');

/******************************************************************************
 * Esta aplicación permite usar una identidad ya existente en el KeyValueStore
 * para ejecutar la transacción de crearContenedor en el chaincode vtc_chaincode
 *****************************************************************************
 * Opciones de configuración
 * ***************************************************************************/
let enrollID = "ibmtoys";
/*****************************************************************************/

//Tiene la configuracion del lado de la red de fabric
var client = hfc.loadFromConfig('./network.yaml');

//Cagamos en el client la configuracion para el lado cliente de hfc
client.loadFromConfig('./client.yaml');

//Inicializamos los crypto-stores y crypto suite
client.initCredentialStores().then((nothing) => {

    //Obtenemos el KeyValueStore
    console.log("Obteniendo la identidad del store..")
    let kvs = client.getStateStore();

    kvs.getValue(enrollID).then((retrievedUser) => {

        if (retrievedUser == null) {
            console.log("No se encontro el usuario en el store ¿Se he hizo el enroll previamente?");
            return;
        }

        //Ponemos el usuario en el contexto para las transacciones
        console.log("Poniendo el usuario en el contexto..")
        let userObj = JSON.parse(retrievedUser);
        client.setUserContext({ username: userObj.name }).then((userInContext) => {

            let channel = client.getChannel("vtcchannel");
            let tx_id = client.newTransactionID();
            //Obtiene los peers de la organización a la que pertenece el cliente (En este caso peer0)
            let peers = client.getPeersForOrg();

            //Preguntamos por los datos para la transacción
            console.log("****************************************************");
            console.log("****Por favor ingrese los datos para el contenedor**");
            console.log("****************************************************");
            prompt.start();
            prompt.get(['descripcion', 'empresaOrigen', 'empresaDestino'], function (err, result) {

                var txproposal = {
                    targets: peers,
                    chaincodeId: 'vtc_chaincode',
                    fcn: 'crearContenedor',
                    args: [result.descripcion, result.empresaOrigen, result.empresaDestino],
                    txId: tx_id
                };

                //Enviamos la propuesta de transacción al peer0 de la Org1Fabricas
                console.log("Enviando propuesta de transacción..\n")
                channel.sendTransactionProposal(txproposal)
                    .then((txresults) => {

                        console.log("Resultado de la simulación en el peer de Org1Fabricas:");
                        console.log(txresults[0][0].response.payload.toString("utf-8") + "\n");
                        console.log("Firmada por:")
                        console.log(txresults[0][0].endorsement.endorser.toString("utf-8"));

                        var txrequest = {
                            proposalResponses: txresults[0],
                            proposal: txresults[1]
                        };


                        //Creamos un ChannelEventHub que nos va a permitir definir un callback que espera a que el peer por defecto de la org en el canal envíe un evento avisando el estado de commit de la transacción
                        //Si tuvieramos mas de un peer creariamos un ChannelEventHub por peer.
                        //Tambien es posible capturar eventos del chaincode (en lugar del peer) que nosotros definamos otro método de la misma manera.
                        let eh = client.getEventHub("peer0.org1.example.com");
                        let tx_id_string = tx_id.getTransactionID();

                        eh.registerTxEvent(
                            tx_id_string,
                            (tx, code) => {
                                eh.unregisterTxEvent(tx_id_string);
                                console.log("Evento: La transacción " + tx_id_string + " fue aplicada al ledger con éxito. " + code);
                                //No queremos seguir esperando eventos
                                eh.disconnect();
                                process.exit();
                            },
                            (err) => {
                                eh.unregisterTxEvent(tx_id_string);
                                console.log("Evento: La transacción " + tx_id_string + " falló en el commit con el error: " + err + " en el peer");
                                //No queremos seguir esperando eventos
                                eh.disconnect();
                                process.exit();
                            }
                        );

                        eh.connect();

                        console.log("Enviando los resultados de la propuesta al orderer..");
                        channel.sendTransaction(txrequest)
                            .then((executed) => {
                                console.log("Se envio al orderer! Con respuesta: "+executed.status);
                                console.log("Esperando evento del peer..")
                            });

                    });


            });

        });

    });

});
