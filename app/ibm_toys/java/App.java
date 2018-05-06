package ilab.ibmtransporte;

import org.hyperledger.fabric.sdk.*;
import org.hyperledger.fabric.sdk.exception.InvalidArgumentException;
import org.hyperledger.fabric.sdk.exception.ProposalException;
import org.hyperledger.fabric.sdk.exception.TransactionException;
import org.hyperledger.fabric.sdk.security.CryptoSuite;
import org.hyperledger.fabric_ca.sdk.HFCAClient;
import org.hyperledger.fabric_ca.sdk.RegistrationRequest;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.Properties;
import java.util.Scanner;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class App {

    public static void main(String[] args) throws Exception {
        //Crear un cliente para fabric ca
        HFCAClient caClient = getFabricCAClient("http://192.168.180.5:7054", null);

        //Cargar en usuario admin, de lo contrario hacer un enroll primero
        Usuario admin = getAdmin(caClient);

        //Usando la identidad del administrador, crear un usuario para la aplicación
        Usuario Usuario = getUser(caClient, admin, "ibmtoysjava");

        //Obtenemos una instancia del cliente de fabric
        HFClient client = getFabricClient();

        //Ponemos el usuario en el contexto de seguridad
        client.setUserContext(admin);

        //Ponemos el canal en el cliente
        obtenerCanal(client);

        Scanner sc = new Scanner(System.in);

        while(true){
            System.out.println("Por favor ingrese la descripción del contenedor: ");
            String desc = sc.nextLine();
            System.out.println("Por favor ingrese la empresa origen del contenedor: ");
            String origen = sc.nextLine();
            System.out.println("Por favor ingrese la empresa destino del contenedor: ");
            String destino = sc.nextLine();
            //Argumentos para el chaincode
            String[] argsChaincode = new String[]{desc,origen,destino};

            //Invocamos el chaincode
            invocarChaincode(client, argsChaincode);

        }


    }

    static void invocarChaincode(HFClient client, String[] args) throws ProposalException, InvalidArgumentException {

        System.out.println("Comenzando a invocar el chaincode");

        //Obtenemos una representacion para el canal
        Channel channel = client.getChannel("vtcchannel");

        //Este objeto representa una propuesta de transacción
        TransactionProposalRequest proposal = client.newTransactionProposalRequest();

        //Creamos un objeto que representa el chaincode
        ChaincodeID fabcarCCId = ChaincodeID.newBuilder().setName("vtc_chaincode").build();
        proposal.setChaincodeID(fabcarCCId);
        proposal.setFcn("crearContenedor");
        proposal.setArgs(args);

        //Enviando propuesta de transacción a un solo peer en este caso porque es como está definido en la endorsement policy
        //En otros casos puede ser necesario enviar a mas de un peer
        System.out.println("Enviando propuesta de transaccion al peer");
        Collection<ProposalResponse> res = channel.sendTransactionProposal(proposal);

        for (ProposalResponse pres : res) {
            String stringResponse = new String(pres.getChaincodeActionResponsePayload());
            System.out.println("Proposal response: "+stringResponse);
        }

        //Creamos un Future para enviar la transacción al orderer
        System.out.println("Enviando respuestas al orderer..");
        CompletableFuture<BlockEvent.TransactionEvent> event = channel.sendTransaction(res,client.getUserContext());
            //Bloqueamos en este caso hasta obtener el Evento asociado a la ejecución de la transacción en el peer
        try {
            BlockEvent.TransactionEvent e = event.get(30, TimeUnit.SECONDS);
            System.out.println("EXITO!");
        } catch (InterruptedException e1) {
            e1.printStackTrace();
        } catch (ExecutionException e1) {
            e1.printStackTrace();
        } catch (TimeoutException e1) {
            e1.printStackTrace();
        }
        
        return;

    }
    static Channel obtenerCanal(HFClient client) throws InvalidArgumentException, TransactionException {

        //Agregamos un peer al canal, en este caso el peer0 de la Org1
        //Reemplazar las direcciones IP por las del peer
        Peer peer = client.newPeer("peer0.org1.example.com", "grpc://192.168.180.5:7051");
        //Creamos un eventHub para escuchar los eventos en el peer
        EventHub eventHub = client.newEventHub("eventhub", "grpc://192.168.180.5:7053");
        //Reemplazar por la dirección IP del orderer
        Orderer orderer = client.newOrderer("orderer.example.com", "grpc://192.168.180.5:7050");
        //Información del canal
        Channel channel = client.newChannel("vtcchannel");
        channel.addOrderer(orderer);
        channel.initialize();
        channel.addPeer(peer);
        channel.addEventHub(eventHub);
        return channel;
    }


    static HFClient getFabricClient() throws Exception {
        //Obtenemos un cryptoSuite
        CryptoSuite cryptoSuite = CryptoSuite.Factory.getCryptoSuite();
        HFClient client = HFClient.createNewInstance();
        client.setCryptoSuite(cryptoSuite);
        return client;
    }

    static Usuario getUser(HFCAClient caClient, Usuario registrar, String userId) throws Exception {

        Usuario Usuario = deserializar(userId);

        if (Usuario == null) {
            //Usar una afilicacion de org1.fabricas.client va a resultar en tres OU en el certificado (org1,fabricas,client)
            RegistrationRequest rr = new RegistrationRequest(userId, "org1.fabricas.client");
            String enrollmentSecret = caClient.register(rr, registrar);
            Enrollment enrollment = caClient.enroll(userId, enrollmentSecret);
            Usuario = new Usuario(userId, "org1.fabricas.client", "Org1FabricasMSP", enrollment);
            serializar(Usuario);
        }
        return Usuario;
    }

    static Usuario getAdmin(HFCAClient caClient) throws Exception {
        Usuario admin = deserializar("admin");
        if (admin == null) {
            //Se usa la identidad admin del RootCA para crear nuevas identidades
            Enrollment adminEnrollment = caClient.enroll("admin", "adminpw");
            //Los campos a demás del nombre en este caso no son relevantes, ya que al ser admin de FabricCA y no del MSP esta identidad admin no sirve para administrar la red (se tendría que usar nadmin con la modificación que tenga el atributo hf.Revoker=true)
            admin = new Usuario("admin", "org1.fabricas", "Org1FabricasMSP", adminEnrollment);
            serializar(admin);
        }

        return admin;
    }

    static HFCAClient getFabricCAClient(String caUrl, Properties caClientProperties) throws Exception {
        CryptoSuite cryptoSuite = CryptoSuite.Factory.getCryptoSuite();
        HFCAClient caClient = HFCAClient.createNewInstance(caUrl, caClientProperties);
        caClient.setCryptoSuite(cryptoSuite);
        return caClient;
    }


    //Serializa objetos de tipo Usuario
    static void serializar(Usuario Usuario) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(Files.newOutputStream(
                Paths.get(Usuario.getName() + ".jso")))) {
            oos.writeObject(Usuario);
        }
    }

    //Deserializa objetos de tipo Usuario
    static Usuario deserializar(String name) throws Exception {
        if (Files.exists(Paths.get(name + ".jso"))) {
            return deserialize(name);
        }
        return null;
    }

    static Usuario deserialize(String name) throws Exception {
        try (ObjectInputStream decoder = new ObjectInputStream(
                Files.newInputStream(Paths.get(name + ".jso")))) {
            return (Usuario) decoder.readObject();
        }
    }
}
