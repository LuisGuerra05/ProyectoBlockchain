# Sistema Blockchain de Verificación de Certificados

**Integrantes**: Luis Guerra, María Guerra, Alejandro Mañón, Renato Calvo

## Descripción General

El proyecto consiste en desarrollar una plataforma basada en blockchain para registrar y verificar certificados académicos y credenciales profesionales. La solución utilizará contratos inteligentes en Ethereum para almacenar de forma segura la huella digital (hash) de cada certificado, permitiendo que cualquier persona o institución pueda comprobar su autenticidad de manera rápida, transparente e inalterable.

## Problema a Resolver

Actualmente es posible falsificar o modificar certificados digitales, lo que obliga a las empresas e instituciones a realizar procesos manuales de validación que suelen ser lentos e ineficientes. La propuesta busca ofrecer un mecanismo descentralizado de verificación que permita validar la autenticidad de un certificado sin depender de terceros.

## Utilidad de la Solución

La plataforma permitirá a universidades, centros de formación y empresas registrar certificados en blockchain y a terceros verificar su autenticidad de forma instantánea. Esto reduce el fraude documental, mejora la confianza en las credenciales y simplifica los procesos de validación.

En un escenario real, el sistema podría integrarse con las plataformas académicas de las instituciones para registrar certificados de forma automática al momento de su emisión. Sin embargo, para efectos de este proyecto se desarrollará una prueba de concepto enfocada en el proceso de registro y verificación utilizando contratos inteligentes.


## Arquitectura de la Solución

La solución estará compuesta por dos elementos principales:

### Smart Contract

Contrato inteligente desarrollado en Solidity y desplegado en la red de pruebas Sepolia. Será responsable de:

* Registrar hashes de certificados.
* Verificar la existencia de certificados registrados.
* Gestionar permisos de registro.
* Mantener la trazabilidad de las operaciones.

### Aplicación Web

Aplicación web estática desarrollada en React y desplegada en Vercel.

La interfaz permitirá:

* Conectar wallets mediante Metamask.
* Registrar certificados (solo usuarios autorizados).
* Verificar certificados (cualquier usuario).
* Consultar información almacenada en blockchain.

Gracias al uso de Ethereum, no será necesario implementar backend ni bases de datos tradicionales, ya que toda la lógica y almacenamiento relevante será gestionada por el contrato inteligente.


## Stack Tecnológico

* Ethereum (Sepolia)
* Solidity
* React
* Ethers.js
* Metamask
* Vercel
* GitHub


## Flujo de Funcionamiento

### Registro de Certificados

1. Una institución autorizada conecta su wallet mediante Metamask.
2. Selecciona un certificado PDF desde la aplicación web.
3. La aplicación calcula el hash criptográfico del documento.
4. Se envía una transacción al contrato inteligente.
5. El contrato verifica que la wallet tenga permisos para registrar certificados.
6. Si la validación es exitosa, el hash queda almacenado en Ethereum.

### Verificación de Certificados

1. Un usuario accede a la aplicación web.
2. Selecciona un certificado PDF.
3. La aplicación calcula el hash del documento.
4. Se consulta el contrato inteligente desplegado en Ethereum.
5. Si el hash existe, el certificado se considera auténtico.
6. Si el hash no existe, el sistema informa que el documento no ha sido registrado o pudo haber sido modificado.



## Consideraciones de Seguridad

* No se almacenarán certificados completos en blockchain.
* No se almacenará información personal de los usuarios.
* Solo se registrarán hashes criptográficos de los documentos.
* El registro de certificados estará restringido a wallets autorizadas.
* La verificación estará disponible para cualquier usuario.


## Estructura del Repositorio

```text
ProyectoBlockchain/
│
├── contracts/      # Contratos inteligentes Solidity
├── frontend/       # Aplicación React
└── README.md
```


## Curso

**Proyecto Final – TICS0870 Blockchain**
**Universidad Adolfo Ibáñez – 2026**
