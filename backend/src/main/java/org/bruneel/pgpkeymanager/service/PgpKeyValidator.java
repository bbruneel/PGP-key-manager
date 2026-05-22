package org.bruneel.pgpkeymanager.service;

import java.util.List;

import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;

public final class PgpKeyValidator {

    public static final int OPENPGP_V4 = 4;
    public static final int OPENPGP_V6 = 6;

    private PgpKeyValidator() {}

    /** Normalizes omitted version to v4; rejects values other than 4 or 6. */
    public static int normalizeOpenpgpVersion(Integer requested) {
        if (requested == null) {
            return OPENPGP_V4;
        }
        if (requested == OPENPGP_V4 || requested == OPENPGP_V6) {
            return requested;
        }
        throw new BadRequestException("openpgpVersion must be 4 or 6");
    }

    public static List<PgpCapability> parseCapabilities(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new BadRequestException("capabilities must not be empty");
        }
        try {
            return raw.stream().map(PgpCapability::fromApi).distinct().toList();
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    public static void validatePrimaryCapabilities(List<PgpCapability> capabilities) {
        if (!capabilities.contains(PgpCapability.CERTIFY)) {
            throw new BadRequestException("Primary key capabilities must include certify");
        }
        if (capabilities.contains(PgpCapability.ENCRYPT)) {
            throw new BadRequestException("Primary key must not include encrypt; use a subkey");
        }
    }

    public static void validateSubkeyRequest(CreateSubkeyRequest request) {
        List<PgpCapability> caps = parseCapabilities(request.capabilities());
        if (caps.contains(PgpCapability.CERTIFY)) {
            throw new BadRequestException("Subkey capabilities must not include certify");
        }
        validateAlgorithmForCapabilities(request.algorithm(), caps);
    }

    public static void validateAlgorithmForCapabilities(AlgorithmSpecDto algorithm, List<PgpCapability> capabilities) {
        String alg = algorithm.algorithm().toLowerCase();
        if (capabilities.contains(PgpCapability.ENCRYPT)) {
            if (!List.of("cv25519", "ecdh", "rsa").contains(alg)) {
                throw new BadRequestException("Encryption subkeys require cv25519, ecdh, or rsa");
            }
            if ("ecdh".equals(alg) && algorithm.curve() == null) {
                throw new BadRequestException("ecdh requires curve");
            }
            if ("rsa".equals(alg) && algorithm.keySize() == null) {
                throw new BadRequestException("rsa requires keySize");
            }
        }
        if (capabilities.contains(PgpCapability.SIGN)) {
            if (!List.of("ed25519", "ecdsa", "rsa").contains(alg)) {
                throw new BadRequestException("Signing subkeys require ed25519, ecdsa, or rsa");
            }
            if ("ecdsa".equals(alg) && algorithm.curve() == null) {
                throw new BadRequestException("ecdsa requires curve");
            }
        }
        if ("rsa".equals(alg) && algorithm.keySize() == null) {
            throw new BadRequestException("rsa requires keySize");
        }
    }

    public static PgpCapability parseCapabilityParam(String capability) {
        try {
            return PgpCapability.fromApi(capability);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    public static KeyRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            return KeyRole.PRIMARY;
        }
        return KeyRole.fromDb(role);
    }
}
