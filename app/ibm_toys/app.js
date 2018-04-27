let hfc = require('fabric-client');
let ca = require('fabric-ca-client');

/******************************************************************************
 * Esta aplicación permite usar una identidad ya existente en el KeyValueStore
 * para ejecutar la transacción de crearContenedor
 *****************************************************************************
 * Opciones de configuración
 * ***************************************************************************/
let enrollID = "nadmin";
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
            //Obtiene los peers de la organización a la que pertenece el cliente
            let peers = client.getPeersForOrg();

            var txproposal = {
                targets: peers,
                chaincodeId: 'vtc_chaincode',
                fcn: 'crearContenedor',
                args: ['Hola', 'sdf', '3434'],
                txId: tx_id
            };

            //Enviamos la propuesta de transacción
            console.log("Enviando propuesta de transacción..")
            channel.sendTransactionProposal(txproposal)
                .then((txresults) => {

                   /* //Creamos un nuevo MSP en el canal
                    let mspMgr = channel.getMSPManager();

                    //Creamos identidades para los rootcerts
                    let idEnrolledRole = {name : "member", mspId : "Org1FabricasMSP"}
                    let rootcerts = [{role : idEnrolledRole, 
                        OrganizationUnit: "org1.fabricas",
                        Identity : userInContext.getIdentity(),
                        signer : userInContext.getSigningIdentity(),
                        id : "Org1FabricasMSP",
                        orgs : }];

                    let mspConfig = {rootCerts: };

                    let mspInstance = mspMgr.addMSP(mspConfig); 
                    
                    //Verificamos las firmas
                    let arrayProposalResponses = txresults[0];

                    for (var i = 0; i < arrayProposalResponses.length; i++) {
                        console.log(arrayProposalResponses[i]);
                        console.log("Resultado: " + channel.verifyProposalResponse(arrayProposalResponses[i]));
                    }*/

                    var txrequest = {
                        proposalResponses: txresults[0],
                        proposal: txresults[1]
                    };

                    console.log("Enviando los resultados de la propusta al orderer..");
                    channel.sendTransaction(txrequest)
                        .then((executed) => {
                            console.log("Se envio al orderer! Imprimiendo respuesta..");
                            console.log(executed)
                        });

                });

        });

    });

    /* //Enrollamos y generamos un contexto para el usuario
    client.setUserContext({ username: 'admin', password: 'adminpw' })
        .then((admin) => {
            let ca = client.getCertificateAuthority();
            let channel = client.getChannel();


            let peers = client.getPeersForOrg();

            let ids = ca.newIdentityService();
            let usuario_reg = "app_test20";
            let id_request = { enrollmentID: usuario_reg, affiliation: "org1.fabricas", type: "client", enrollmentSecret: "app_test1" };

            console.log("intentato registrar..")
            ids.create(id_request, admin).then((secret) => {
            console.log("indentidad registrada");

                let urequest = {
                    enrollmentID: usuario_reg,
                    enrollmentSecret: secret
                };

                //Usamos la identidad del administrador para enrollar ibm_toys
                console.log("Intentando enrollar");
                ca.enroll(urequest)
                    .then((enrollment) => {
                        console.log("Se enrollo la identidad "+usuario_reg);
                        //Crear un usuario con el material obtenido
                        let crypto = { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate };
                        
                        client.createUser({username: usuario_reg, mspid: "Org1FabricasMSP", cryptoContent: crypto, skipPersistence: false }).then((createdUser) => {
                            

                        //Ponemos el usuario en el nuevo contexto
                        console.log("Intentando crear el contexto");
                        console.log(createdUser.getName());
                        client.setUserContext(createdUser).then(() => {

                            let tx_id = client.newTransactionID();
                            console.log(tx_id);

                            var txproposal = {
                                targets: peers,
                                chaincodeId: 'vtc_chaincode',
                                fcn: 'crearContenedor',
                                args: ['Hola', 'sdf', '3434'],
                                txId: tx_id
                            };

                        channel.sendTransactionProposal(txproposal)
                                .then((txresults) => {
                                    console.log("llegue aca!");
                                    //console.log(txresults);

                                    //Verify signatires
                                    let arrayProposalResponses = txresults[0];

                                    for(var i=0; i<arrayProposalResponses.length; i++){
                                        console.log(arrayProposalResponses[i]);
                                        console.log("Resultado: "+channel.verifyProposalResponse(arrayProposalResponses[i]));
                                    }

                                    

                                    var txrequest = {
                                        proposalResponses: txresults[0],
                                        proposal: txresults[1]
                                    };

                                    console.log("Enviando al orderer!!");
                                    channel.sendTransaction(txrequest)
                                        .then((executed) => {
                                            console.log("Se envio al orderer!!");
                                            console.log(executed)
                                        });

                                });

                        });

                        });

                    });

            });

        }); */
});
