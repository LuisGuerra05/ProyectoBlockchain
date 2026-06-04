# Sistema Blockchain de Verificación de Certificados

Sistema descentralizado para registrar y verificar la autenticidad de certificados académicos y credenciales profesionales, construido sobre Ethereum usando contratos inteligentes en Solidity.

**Integrantes:** Luis Guerra, María Guerra, Alejandro Mañón, Renato Calvo  
**Curso:** TICS0870 Blockchain  
**Universidad:** Universidad Adolfo Ibáñez


## ¿Qué hace este proyecto?

Permite a instituciones autorizadas registrar el hash criptográfico de un certificado en la blockchain de Ethereum, y a cualquier persona verificar si un certificado es auténtico consultando ese hash.

El sistema **nunca almacena el archivo PDF**, solo su huella digital (hash keccak256). Esto garantiza privacidad, reduce costos y hace imposible alterar un certificado sin que el sistema lo detecte.


## ¿Cómo funciona?

### Flujo de registro
1. Una institución autorizada sube un PDF a la interfaz web.
2. La aplicación calcula el hash keccak256 del archivo localmente.
3. Se envía una transacción al contrato inteligente con ese hash.
4. El contrato verifica que la wallet esté autorizada y registra el hash en la blockchain.

### Flujo de verificación
1. Cualquier usuario sube un PDF a la interfaz web.
2. La aplicación calcula el hash keccak256 del archivo localmente.
3. Se consulta el contrato inteligente con ese hash.
4. Si el hash existe en la blockchain, el certificado es auténtico.
5. Si no existe, el certificado no fue registrado o fue modificado.


## Contrato Inteligente

### Roles y permisos

El contrato maneja dos niveles de acceso:

| Rol | Cantidad | Puede hacer |
|-----|----------|-------------|
| **Owner** | 1 (quien desplegó el contrato) | Autorizar y revocar issuers |
| **Issuer autorizado** | Múltiples | Registrar certificados |
| **Cualquier usuario** | Ilimitado | Verificar certificados (solo lectura) |

> El owner también es issuer autorizado por defecto al desplegar el contrato.

### Restricciones del contrato

- Solo el **owner** puede autorizar nuevas instituciones (`authorizeIssuer`).
- Solo el **owner** puede revocar instituciones (`revokeIssuer`).
- Solo **issuers autorizados** pueden registrar certificados (`registerCertificate`).
- No se puede registrar el mismo hash dos veces, lo que evita duplicados.
- Cualquiera puede **verificar** un certificado sin necesidad de wallet (`verifyCertificate`).

### Eventos emitidos

Cada acción importante queda registrada como evento en la blockchain:

| Evento | Cuándo se emite |
|--------|----------------|
| `CertificateRegistered` | Al registrar un certificado |
| `IssuerAuthorized` | Al autorizar una institución |
| `IssuerRevoked` | Al revocar una institución |

### Contrato desplegado en Sepolia

- **Dirección:** `0x73ee4f0D0898180Eb30e6887188245c50E9a54Cc`
- **Red:** Sepolia Testnet (chain ID: 11155111)
- **Explorador:** https://sepolia.etherscan.io/address/0x73ee4f0D0898180Eb30e6887188245c50E9a54Cc


## Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| Solidity | Contrato inteligente |
| Foundry (Forge, Cast, Anvil) | Compilación, tests y deploy |
| React + Vite | Interfaz web |
| Ethers.js | Conexión frontend con blockchain |
| MetaMask | Wallet y firma de transacciones |
| Sepolia | Red de prueba de Ethereum |
| Vercel | Deploy del frontend |


## Estructura del repositorio

```
ProyectoBlockchain/
├── contracts/
│   ├── src/
│   │   └── CertificateRegistry.sol
│   ├── test/
│   │   └── CertificateRegistry.t.sol
│   ├── script/
│   ├── lib/
│   └── foundry.toml
└── frontend/
```


## Desarrollo local

### Requisitos

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git Bash o terminal Unix

### Instalación

```bash
git clone <url-del-repo>
cd ProyectoBlockchain/contracts
forge install
```

### Compilar

```bash
cd contracts
forge build
```

### Correr tests

```bash
forge test -v
```

Los tests verifican:
- ✅ El owner puede autorizar issuers.
- ✅ Un issuer autorizado puede registrar certificados.
- ✅ Un usuario no autorizado no puede registrar (revierte con `NotAuthorized`).
- ✅ No se puede registrar el mismo hash dos veces (revierte con `AlreadyRegistered`).
- ✅ Un hash no registrado devuelve `false`.
- ✅ Solo el owner puede revocar issuers (revierte con `NotOwner`).
- ✅ El evento `CertificateRegistered` se emite correctamente.


## Interactuar con el contrato sin interfaz (terminal)

Puedes interactuar directamente con el contrato desde la terminal usando `cast`. Útil para pruebas y administración.

### Configuración inicial

```bash
export SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
export CONTRACT=0x73ee4f0D0898180Eb30e6887188245c50E9a54Cc
```

### Verificar un certificado (cualquier usuario)

```bash
cast call $CONTRACT "verifyCertificate(bytes32)(bool)" \
  0xHASH_DEL_CERTIFICADO \
  --rpc-url $SEPOLIA_RPC
```

Devuelve `true` si el certificado está registrado, `false` si no.

### Registrar un certificado (solo issuers autorizados)

```bash
cast send $CONTRACT "registerCertificate(bytes32)" \
  0xHASH_DEL_CERTIFICADO \
  --rpc-url $SEPOLIA_RPC \
  --account metamask
```

### Autorizar una nueva institución (solo owner)

```bash
cast send $CONTRACT "authorizeIssuer(address)" \
  0xDIRECCION_DE_LA_INSTITUCION \
  --rpc-url $SEPOLIA_RPC \
  --account metamask
```

### Revocar una institución (solo owner)

```bash
cast send $CONTRACT "revokeIssuer(address)" \
  0xDIRECCION_DE_LA_INSTITUCION \
  --rpc-url $SEPOLIA_RPC \
  --account metamask
```

### Consultar si una wallet está autorizada

```bash
cast call $CONTRACT "authorizedIssuers(address)(bool)" \
  0xDIRECCION_A_CONSULTAR \
  --rpc-url $SEPOLIA_RPC
```

### Consultar el owner del contrato

```bash
cast call $CONTRACT "owner()(address)" \
  --rpc-url $SEPOLIA_RPC
```

### Calcular el hash de un archivo (para pruebas)

```bash
cast keccak $(cat archivo.pdf | xxd -p | tr -d '\n')
```

En la aplicación web esto lo hace automáticamente ethers.js al subir el PDF.

### Probar localmente con Anvil

```bash
# Terminal 1: levantar blockchain local
anvil

# Terminal 2: desplegar contrato localmente
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge create src/CertificateRegistry.sol:CertificateRegistry \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY \
  --broadcast

export CONTRACT=0xDIRECCION_DEL_DEPLOY_LOCAL

# Registrar certificado
cast send $CONTRACT "registerCertificate(bytes32)" \
  0x1234000000000000000000000000000000000000000000000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY

# Verificar certificado
cast call $CONTRACT "verifyCertificate(bytes32)(bool)" \
  0x1234000000000000000000000000000000000000000000000000000000000000 \
  --rpc-url http://127.0.0.1:8545
```


## Interfaz Web

En desarrollo, próximamente.

La interfaz web permitirá:
- Conectar wallet con MetaMask.
- Registrar certificados subiendo un PDF (solo issuers autorizados).
- Verificar certificados subiendo un PDF (cualquier usuario).
- Ver el estado del certificado en tiempo real.


## Seguridad

- El contrato **nunca almacena archivos**, solo hashes criptográficos.
- El control de acceso se gestiona on-chain mediante wallets autorizadas.
- Los hashes son inmutables una vez registrados en la blockchain.
- Cualquier modificación al PDF cambia su hash, lo que hace detectable la falsificación.
- Las private keys nunca deben compartirse ni subirse al repositorio.


## Consideraciones

- Este proyecto es una prueba de concepto desplegada en Sepolia (red de prueba).
- El contrato no ha sido auditado para producción. En un entorno real se recomienda agregar mecanismos de actualización y auditoría.