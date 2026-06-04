// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CertificateRegistry {

    mapping(bytes32 => bool) private certificates;
    mapping(address => bool) public authorizedIssuers;
    address public owner;

    event CertificateRegistered(bytes32 indexed certHash, address indexed issuedBy, uint256 timestamp);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    error NotAuthorized();
    error AlreadyRegistered();
    error NotOwner();

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    function authorizeIssuer(address issuer) external {
        if (msg.sender != owner) revert NotOwner();
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function revokeIssuer(address issuer) external {
        if (msg.sender != owner) revert NotOwner();
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    function registerCertificate(bytes32 certHash) external {
        if (!authorizedIssuers[msg.sender]) revert NotAuthorized();
        if (certificates[certHash]) revert AlreadyRegistered();
        certificates[certHash] = true;
        emit CertificateRegistered(certHash, msg.sender, block.timestamp);
    }

    function verifyCertificate(bytes32 certHash) external view returns (bool) {
        return certificates[certHash];
    }
}