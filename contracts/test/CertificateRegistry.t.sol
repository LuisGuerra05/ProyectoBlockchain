// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/CertificateRegistry.sol";

contract CertificateRegistryTest is Test {

    CertificateRegistry registry;
    address owner = address(this);
    address authorizedIssuer = address(0x1);
    address unauthorizedUser = address(0x2);

    bytes32 constant CERT_HASH = keccak256("certificado_ejemplo.pdf");

    function setUp() public {
        registry = new CertificateRegistry();
    }

    function test_AuthorizeIssuer() public {
        registry.authorizeIssuer(authorizedIssuer);
        assertTrue(registry.authorizedIssuers(authorizedIssuer));
    }

    function test_RegisterCertificate() public {
        registry.authorizeIssuer(authorizedIssuer);
        vm.prank(authorizedIssuer);
        registry.registerCertificate(CERT_HASH);
        assertTrue(registry.verifyCertificate(CERT_HASH));
    }

    function test_RevertWhen_UnauthorizedRegister() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert(CertificateRegistry.NotAuthorized.selector);
        registry.registerCertificate(CERT_HASH);
    }

    function test_RevertWhen_DuplicateRegister() public {
        registry.registerCertificate(CERT_HASH);
        vm.expectRevert(CertificateRegistry.AlreadyRegistered.selector);
        registry.registerCertificate(CERT_HASH);
    }

    function test_VerifyNonExistentCertificate() public view {
        assertFalse(registry.verifyCertificate(CERT_HASH));
    }

    function test_RevertWhen_NonOwnerRevokes() public {
        registry.authorizeIssuer(authorizedIssuer);
        vm.prank(unauthorizedUser);
        vm.expectRevert(CertificateRegistry.NotOwner.selector);
        registry.revokeIssuer(authorizedIssuer);
    }

    function test_EmitEventOnRegister() public {
        vm.expectEmit(true, true, false, true);
        emit CertificateRegistry.CertificateRegistered(CERT_HASH, owner, block.timestamp);
        registry.registerCertificate(CERT_HASH);
    }
}