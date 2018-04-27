let hfc = require('fabric-client');

/****************************************************************
 * El siguiente script hace un enroll de la identidad registrada 
 * en Fabric CA y guarda la clave privada y certificado en
 * el KeyValueStore por defecto
 * 
 * Configuración para la identidad a hacer enroll
 * ***************************************************************/
let enrollID = "nadmin";
let enrollSecret = "nadminpw";
let fabricCaAdminId = 'admin';
let fabricCaAdminSecret = 'adminpw';
/*****************************************************************/

var client = hfc.loadFromConfig('./network.yaml');
client.loadFromConfig('./client.yaml');

client.initCredentialStores().then((nothing) => {

    //Utilizamos la identidad del administrador de FabricCA para hacer enroll de otra
    client.setUserContext({ username: fabricCaAdminId, password: fabricCaAdminSecret})
        .then((admin) => {

            //Instancia de FabricCAServices
            let ca = client.getCertificateAuthority();
            let channel = client.getChannel();
            let ids = ca.newIdentityService();
            let id_request = { enrollmentID: enrollID, affiliation: "org1.fabricas", type: "client", enrollmentSecret: enrollSecret };

            //console.log("Intentato registrar en FabriCA la identidad " + enrollID)
            //ids.create(id_request, admin).then((secret) => {
                console.log("Registro con éxito!");

                let urequest = {
                    enrollmentID: enrollID,
                    enrollmentSecret: enrollSecret
                };

                //Usamos la identidad del administrador para enrollar la recién creada
                console.log("Intentando enrollar la identidad " + enrollID);
                ca.enroll(urequest)
                    .then((enrollment) => {
                        console.log("Se enrollo la identidad " + enrollID);


                        //Crear un usuario con el material obtenido
                        console.log("Por crear un usuario con el material criptográfico..")
                        let crypto = { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate };

                        client.createUser({ username: enrollID, mspid: "Org1FabricasMSP", cryptoContent: crypto, skipPersistence: false }).then((createdUser) => {
                            console.log("Usuario creado y persistido con éxito en el KeyValueStore");
                        });

                    });

           // });

        });
});