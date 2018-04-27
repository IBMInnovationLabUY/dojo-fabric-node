let hfc = require('fabric-client');
let fca = require('fabric-ca-client');
let fs = require('fs');

let useStore = true;
let channel_name = "vtcchannel";
go();

async function go(){
//Creamos el cryptosuite
let cryptoSuite = hfc.newCryptoSuite();
cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: "/home/server/fabric/apps"}));


//Creamos el client
let client = hfc;

//Creamos un usuario

let pemPrivKey = fs.readFileSync("/home/server/fabric/red/fabric-ca-client/nadmin/msp/keystore/4602ff258f4a030f41b116fe470e5ceaa314ff719cbcf07365f0c375aef9a53b_sk",{encoding: "UTF-8"});
let pemPublicCert = fs.readFileSync("/home/server/fabric/red/fabric-ca-client/nadmin/msp/signcerts/cert.pem",{encoding: "UTF-8"});
let cryptoContent = {privateKeyPEM: pemPrivKey, signedCertPEM: pemPublicCert};
let mspID = "Org1FabricasMSP";
let user = client.createUser("nadmin",mspID, cryptoContent, true);

//Configuramos el cliente
client.setCryptoSuite(cryptoSuite);
client.setUserContext(user, true);

//Creamos el canal
var channel = client.newChannel(channel_name);

//Agregamos el orderer
let con_ops = {"request-timeout" : "10000"};
let orderer = channel.newOrderer("grpc://orderer.example.com:7050", con_ops);


//Agregamos los peers
let peer = channel.newPeer("http://172.19.0.10:7054", con_ops);
}
