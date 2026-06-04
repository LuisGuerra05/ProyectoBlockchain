// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CertificateRegistry {

    // Almacena los hashes de certificados registrados
    mapping(bytes32 => bool) private certificates;

    // Almacena qué wallets están autorizadas para registrar certificados
    mapping(address => bool) public authorizedIssuers;

    // Wallet que desplegó el contrato, con permisos de administración
    address public owner;

    // Se emite cada vez que se registra un certificado exitosamente
    event CertificateRegistered(bytes32 indexed certHash, address indexed issuedBy, uint256 timestamp);

    // Se emite cuando el owner autoriza una nueva institución
    event IssuerAuthorized(address indexed issuer);

    // Se emite cuando el owner revoca una institución
    event IssuerRevoked(address indexed issuer);

    // Error cuando una wallet no autorizada intenta registrar un certificado
    error NotAuthorized();

    // Error cuando se intenta registrar un hash que ya existe
    error AlreadyRegistered();

    // Error cuando alguien que no es el owner intenta administrar issuers
    error NotOwner();

    // Al desplegar, se guarda el deployer como owner y se le autoriza como issuer
    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    // Agrega una wallet como issuer autorizado. Solo el owner puede llamar esta función
    function authorizeIssuer(address issuer) external {
        if (msg.sender != owner) revert NotOwner();
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    // Revoca los permisos de un issuer. Solo el owner puede llamar esta función
    function revokeIssuer(address issuer) external {
        if (msg.sender != owner) revert NotOwner();
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    // Registra el hash de un certificado en la blockchain.
    // Solo issuers autorizados pueden llamar esta función y cada hash solo puede registrarse una vez
    function registerCertificate(bytes32 certHash) external {
        if (!authorizedIssuers[msg.sender]) revert NotAuthorized();
        if (certificates[certHash]) revert AlreadyRegistered();
        certificates[certHash] = true;
        emit CertificateRegistered(certHash, msg.sender, block.timestamp);
    }

    // Consulta si un hash está registrado. Cualquier usuario puede llamar esta función
    function verifyCertificate(bytes32 certHash) external view returns (bool) {
        return certificates[certHash];
    }
}