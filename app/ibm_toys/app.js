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
        client.setUserContext({username : userObj.name}).then((userInContext) => {

            let channel = client.getChannel("vtcchannel");
            let tx_id = client.newTransactionID();
            //Obtiene los peers de la organización a la que pertenece el cliente (En este caso peer0)
            let peers = client.getPeersForOrg();

            //Preguntamos por los datos para la transacción
            console.log("****************************************************");
            console.log("****Por favor ingrese los datos para el contenedor**");
            console.log("****************************************************");
            prompt.start();
            prompt.get(['descripcion', 'empresaOrigen','empresaDestino'], function (err, result) {
              
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
                        console.log(txresults[0][0].response.payload.toString("utf-8")+"\n");
                        console.log("Firmada por:")
                        console.log(txresults[0][0].endorsement.endorser.toString("utf-8"));
    
                        var txrequest = {
                            proposalResponses: txresults[0],
                            proposal: txresults[1]
                        };
    
                        console.log("Enviando los resultados de la propuesta al orderer..");
                        channel.sendTransaction(txrequest)
                            .then((executed) => {
                                console.log("Se envio al orderer! Imprimiendo respuesta..");
                                console.log(executed.status)
                            });
    
                    });
            
            
            });

        });

    });

});
