// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MessageVerifier {
    address public immutable owner;

    mapping(bytes32 => Verification) private verifications;

    struct Verification {
        address sender;
        uint256 timestamp;
        bool exists;
    }

    event MessageVerified(bytes32 indexed messageHash, address indexed sender, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function verifyMessage(bytes32 messageHash) external {
        require(messageHash != bytes32(0), "MessageVerifier: empty hash");
        require(!verifications[messageHash].exists, "MessageVerifier: already verified");

        verifications[messageHash] = Verification({
            sender: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit MessageVerified(messageHash, msg.sender, block.timestamp);
    }

    function isMessageVerified(bytes32 messageHash) external view returns (bool) {
        return verifications[messageHash].exists;
    }

    function getVerification(bytes32 messageHash) external view returns (address sender, uint256 timestamp, bool exists) {
        Verification memory verification = verifications[messageHash];
        return (verification.sender, verification.timestamp, verification.exists);
    }
}
