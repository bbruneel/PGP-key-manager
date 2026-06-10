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

    /** Validates a version read from existing key material (register/import paths). */
    public static int validateDetectedOpenpgpVersion(int detected) {
        if (detected == OPENPGP_V4 || detected == OPENPGP_V6) {
            return detected;
        }
        throw new BadRequestException("Unsupported OpenPGP key packet version: " + detected);
    }

    public static void rejectOpenpgpVersionOnRegister(Integer openpgpVersion) {
        if (openpgpVersion != null) {
            throw new BadRequestException(
                    "openpgpVersion is only supported when generating a new key, not when registering existing material");
        }
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

    public static void validateSubkeyRequest(CreateSubkeyRequest request, int openpgpVersion) {
        List<PgpCapability> caps = parseCapabilities(request.capabilities());
        if (caps.contains(PgpCapability.CERTIFY)) {
            throw new BadRequestException("Subkey capabilities must not include certify");
        }
        validateAlgorithmForOpenpgpVersion(request.algorithm(), openpgpVersion);
        validateAlgorithmForCapabilities(request.algorithm(), caps);
    }

    public static void validateSubkeyRequest(CreateSubkeyRequest request) {
        validateSubkeyRequest(request, OPENPGP_V4);
    }

    public static void validatePrimaryAlgorithm(AlgorithmSpecDto algorithm, int openpgpVersion) {
        validateAlgorithmForOpenpgpVersion(algorithm, openpgpVersion);
        String alg = algorithm.algorithm().toLowerCase();
        if ("cv25519".equals(alg) || "ecdh".equals(alg) || "x448".equals(alg)) {
            throw new BadRequestException("Primary keys cannot use encryption-only algorithms");
        }
        validateAlgorithmForCapabilities(
                algorithm, List.of(PgpCapability.CERTIFY, PgpCapability.SIGN));
    }

    public static void validateAlgorithmForOpenpgpVersion(AlgorithmSpecDto algorithm, int openpgpVersion) {
        String alg = algorithm.algorithm().toLowerCase();
        if (("ed448".equals(alg) || "x448".equals(alg)) && openpgpVersion != OPENPGP_V6) {
            throw new BadRequestException("ed448 and x448 require OpenPGP v6");
        }
    }

    public static void validateAlgorithmForCapabilities(AlgorithmSpecDto algorithm, List<PgpCapability> capabilities) {
        String alg = algorithm.algorithm().toLowerCase();
        if (capabilities.contains(PgpCapability.ENCRYPT)) {
            if (!List.of("cv25519", "ecdh", "rsa", "x448").contains(alg)) {
                throw new BadRequestException("Encryption subkeys require cv25519, ecdh, rsa, or x448");
            }
            if ("ecdh".equals(alg) && algorithm.curve() == null) {
                throw new BadRequestException("ecdh requires curve");
            }
            if ("rsa".equals(alg) && algorithm.keySize() == null) {
                throw new BadRequestException("rsa requires keySize");
            }
        }
        if (capabilities.contains(PgpCapability.SIGN) || capabilities.contains(PgpCapability.AUTHENTICATE)) {
            if (!List.of("ed25519", "ecdsa", "rsa", "ed448").contains(alg)) {
                throw new BadRequestException("Signing subkeys require ed25519, ecdsa, rsa, or ed448");
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
