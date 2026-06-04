// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/CertificateRegistry.sol";

contract CertificateRegistryTest is Test {

    CertificateRegistry registry;

    // El contrato de test actúa como owner al desplegarlo
    address owner = address(this);
    address authorizedIssuer = address(0x1);
    address unauthorizedUser = address(0x2);

    // Hash de ejemplo que simula el keccak256 de un PDF real
    bytes32 constant CERT_HASH = keccak256("certificado_ejemplo.pdf");

    // Se ejecuta antes de cada test, desplegando una instancia limpia del contrato
    function setUp() public {
        registry = new CertificateRegistry();
    }

    // Verifica que el owner puede autorizar una nueva institución
    function test_AuthorizeIssuer() public {
        registry.authorizeIssuer(authorizedIssuer);
        assertTrue(registry.authorizedIssuers(authorizedIssuer));
    }

    // Verifica que un issuer autorizado puede registrar un certificado
    function test_RegisterCertificate() public {
        registry.authorizeIssuer(authorizedIssuer);
        vm.prank(authorizedIssuer); // simula que la siguiente llamada la hace authorizedIssuer
        registry.registerCertificate(CERT_HASH);
        assertTrue(registry.verifyCertificate(CERT_HASH));
    }

    // Verifica que una wallet no autorizada no puede registrar certificados
    function test_RevertWhen_UnauthorizedRegister() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert(CertificateRegistry.NotAuthorized.selector);
        registry.registerCertificate(CERT_HASH);
    }

    // Verifica que no se puede registrar el mismo hash dos veces
    function test_RevertWhen_DuplicateRegister() public {
        registry.registerCertificate(CERT_HASH);
        vm.expectRevert(CertificateRegistry.AlreadyRegistered.selector);
        registry.registerCertificate(CERT_HASH);
    }

    // Verifica que un hash no registrado devuelve false
    function test_VerifyNonExistentCertificate() public view {
        assertFalse(registry.verifyCertificate(CERT_HASH));
    }

    // Verifica que solo el owner puede revocar issuers
    function test_RevertWhen_NonOwnerRevokes() public {
        registry.authorizeIssuer(authorizedIssuer);
        vm.prank(unauthorizedUser);
        vm.expectRevert(CertificateRegistry.NotOwner.selector);
        registry.revokeIssuer(authorizedIssuer);
    }

    // Verifica que el evento CertificateRegistered se emite con los datos correctos
    function test_EmitEventOnRegister() public {
        vm.expectEmit(true, true, false, true);
        emit CertificateRegistry.CertificateRegistered(CERT_HASH, owner, block.timestamp);
        registry.registerCertificate(CERT_HASH);
    }
}