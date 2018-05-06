let hfc = require('fabric-client');

/****************************************************************
 * El siguiente script registra y hace un enroll de la identidad 
 * en Fabric CA. Guarda la clave privada y certificado en
 * el KeyValueStore por defecto
 * 
 * Configuración para la identidad a hacer enroll
 * **************************************************************
 * Por más informacion de como usar connection profile:
 * https://fabric-sdk-node.github.io/tutorial-network-config.html
 * ***************************************************************/

let enrollID = "ibmtoys";
let enrollSecret = "ibmtoyspw";
let fabricCaAdminId = 'admin';
let fabricCaAdminSecret = 'adminpw';
/*****************************************************************/

//Carga el objeto cliente con la topología de red que definimos en el archivo network.yaml
var client = hfc.loadFromConfig('./network.yaml');
//Agrega al cliente ya cargado las definiciones de client.yaml
client.loadFromConfig('./client.yaml');

//Este metodo se encarga de inicializar los credential stores definidos en el archivo client.yaml
client.initCredentialStores().then((nothing) => {

    //Utilizamos la identidad del administrador de FabricCA para hacer enroll de otra
    /* setUserContext() va a buscar el usuario en los credential stores, si no lo encuentra va a crear una instancia que
     * representa el CA tal como está definido en network.yaml. Después intentará hacer un enroll del usuario con el CA 
     * que en este caso fue registrado previamente por ser el usuario de bootstrap del CA y tiene permisos para registrar
     * otras identidades en el CA
     */
    client.setUserContext({ username: fabricCaAdminId, password: fabricCaAdminSecret})
        .then((admin) => {

            //Instancia de FabricCAServices
            let ca = client.getCertificateAuthority();
            let channel = client.getChannel();
            let ids = ca.newIdentityService();

            //Esto es una petición para registrar una identidad
            let id_request = { enrollmentID: enrollID, affiliation: "org1.fabricas", type: "client", enrollmentSecret: enrollSecret };

            console.log("Intentato registrar en FabriCA la identidad " + enrollID)

            //Registramos la identidad perteneciente a Org1Fabricas en el CA con los permisos que nos otorga la identidad admin del CA
            ids.create(id_request, admin).then((secret) => {
                console.log("Registro con éxito!");

                //A la hora de hacer el enroll pedimos los siguientes atributos en el eCert
                let atributeRequests = [{name: "hf.Affiliation", optional : false}, 
                                        {name: "hf.Type", optional : false},
                                        {name: "hf.EnrollmentID", optional :false}];
                let urequest = {
                    enrollmentID: enrollID,
                    enrollmentSecret: enrollSecret,
                    attr_reqs : atributeRequests
                };

                //Usamos la identidad del administrador para enrollar la recién creada
                console.log("Intentando enrollar la identidad " + enrollID);
                ca.enroll(urequest)
                    .then((enrollment) => {
                        console.log("Se enrollo la identidad " + enrollID);

                        //Crear un usuario con el material cryptográfico obtenido del enroll (clave privada y certificado)
                        console.log("Por crear un usuario con el material criptográfico..")
                        let crypto = { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate };

                        client.createUser({ username: enrollID, mspid: "Org1FabricasMSP", cryptoContent: crypto, skipPersistence: false }).then((createdUser) => {
                            console.log("Usuario creado y persistido con éxito en el KeyValueStore");
                        });

                    });

           });

        });
});