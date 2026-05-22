package org.bruneel.pgpkeymanager.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService.KeyRingUpdate;
import org.bruneel.pgpkeymanager.crypto.SubkeyMaterial;
import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.domain.RevocationReason;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository.PgpKeyInsert;
import org.bruneel.pgpkeymanager.web.dto.AlgorithmSpecDto;
import org.bruneel.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.ExtendExpiryRequest;
import org.bruneel.pgpkeymanager.web.dto.RevokeKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.RotateKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

@Service
public class PgpKeyService {

    private final PgpKeyRepository pgpKeyRepository;
    private final PgpCryptoService pgpCryptoService;
    private final KeyOperationLogger operationLogger;

    public PgpKeyService(
            PgpKeyRepository pgpKeyRepository,
            PgpCryptoService pgpCryptoService,
            KeyOperationLogger operationLogger) {
        this.pgpKeyRepository = pgpKeyRepository;
        this.pgpCryptoService = pgpCryptoService;
        this.operationLogger = operationLogger;
    }

    public List<PgpKey> listForUser(AppUser user, KeyRole role, String status, PgpCapability capability) {
        return pgpKeyRepository.findAllByUserId(user.id(), role, status, capability);
    }

    public PgpKey getForUser(AppUser user, UUID id) {
        return pgpKeyRepository
                .findByIdAndUserId(id, user.id())
                .orElseThrow(() -> new KeyNotFoundException(id));
    }

    public PgpKey create(AppUser user, CreatePgpKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("create_key", user.id(), null);
        try {
            PgpKey created = isGenerateRequest(request) ? generatePrimary(user, request) : registerKey(user, request);
            operationLogger.succeeded("create_key", user.id(), created.id(), System.currentTimeMillis() - start);
            return created;
        } catch (RuntimeException ex) {
            operationLogger.failed("create_key", user.id(), null, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public PgpKey update(AppUser user, UUID id, UpdatePgpKeyRequest request) {
        return pgpKeyRepository
                .updateMetadata(
                        id,
                        user.id(),
                        request.label(),
                        request.expiresAt(),
                        request.storageProvider(),
                        request.storageRef())
                .orElseThrow(() -> new KeyNotFoundException(id));
    }

    public void delete(AppUser user, UUID id) {
        if (!pgpKeyRepository.deleteByIdAndUserId(id, user.id())) {
            throw new KeyNotFoundException(id);
        }
    }

    public List<PgpKey> listSubkeys(AppUser user, UUID primaryKeyId) {
        PgpKey primary = requirePrimary(user, primaryKeyId);
        return pgpKeyRepository.findSubkeysByParentId(primary.id(), user.id());
    }

    public PgpKey getSubkey(AppUser user, UUID primaryKeyId, UUID subkeyId) {
        requirePrimary(user, primaryKeyId);
        return pgpKeyRepository
                .findSubkeyByIdAndParentId(subkeyId, primaryKeyId, user.id())
                .orElseThrow(() -> new KeyNotFoundException(subkeyId));
    }

    public PgpKey createSubkey(AppUser user, UUID primaryKeyId, CreateSubkeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("create_subkey", user.id(), primaryKeyId, null);
        try {
            PgpKeyValidator.validateSubkeyRequest(request);
            PgpKey primary = requirePrimaryWithPrivate(user, primaryKeyId);
            List<PgpCapability> capabilities = PgpKeyValidator.parseCapabilities(request.capabilities());
            Instant expiresAt = request.validity() != null ? request.validity().expiresAt() : null;
            char[] passphrase = requirePassphrase(request.passphrase());

            SubkeyMaterial material =
                    pgpCryptoService.addSubkey(
                            primary.encryptedPrivateArmored(),
                            passphrase,
                            capabilities,
                            request.algorithm(),
                            expiresAt);

            pgpKeyRepository.updateKeyringMaterial(
                    primary.id(),
                    user.id(),
                    material.updatedArmoredPublic(),
                    material.updatedArmoredPrivate(),
                    null,
                    null,
                    null);

            PgpKey subkey =
                    insertKey(
                            user,
                            primary.label(),
                            material,
                            KeyType.PRIVATE,
                            KeyRole.SUBKEY,
                            primary.id(),
                            primary.storageProvider(),
                            primary.storageRef());

            operationLogger.succeeded("create_subkey", user.id(), subkey.id(), System.currentTimeMillis() - start);
            return subkey;
        } catch (RuntimeException ex) {
            operationLogger.failed("create_subkey", user.id(), primaryKeyId, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public PgpKey revoke(AppUser user, UUID keyId, RevokeKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("revoke_key", user.id(), keyId);
        try {
            PgpKey key = getForUser(user, keyId);
            ensureNotRevoked(key);
            RevocationReason reason = RevocationReason.fromApi(request.reason());
            Instant revokedAt = Instant.now();

            if (key.isPrimary() && key.encryptedPrivateArmored() != null) {
                char[] passphrase = requirePassphrase(request.passphrase());
                long targetKeyId = org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport.parseKeyIdHex(key.keyId());
                if (targetKeyId == 0) {
                    targetKeyId = parseKeyId(key);
                }
                KeyRingUpdate updated =
                        pgpCryptoService.revokeKeyInRing(
                                key.encryptedPrivateArmored(),
                                passphrase,
                                targetKeyId,
                                revocationReasonCode(reason));
                pgpKeyRepository.updateKeyringMaterial(
                        key.id(),
                        user.id(),
                        updated.armoredPublic(),
                        updated.armoredPrivate(),
                        null,
                        revokedAt,
                        reason);
            } else if (key.parentKeyId() != null) {
                PgpKey primary = requirePrimaryWithPrivate(user, key.parentKeyId());
                char[] passphrase = requirePassphrase(request.passphrase());
                long targetKeyId = parseKeyId(key);
                KeyRingUpdate updated =
                        pgpCryptoService.revokeKeyInRing(
                                primary.encryptedPrivateArmored(),
                                passphrase,
                                targetKeyId,
                                revocationReasonCode(reason));
                pgpKeyRepository.updateKeyringMaterial(
                        primary.id(),
                        user.id(),
                        updated.armoredPublic(),
                        updated.armoredPrivate(),
                        null,
                        null,
                        null);
            }

            PgpKey revoked =
                    pgpKeyRepository
                            .markRevoked(key.id(), user.id(), revokedAt, reason)
                            .orElseThrow(() -> new KeyNotFoundException(keyId));
            operationLogger.succeeded("revoke_key", user.id(), keyId, System.currentTimeMillis() - start);
            return revoked;
        } catch (RuntimeException ex) {
            operationLogger.failed("revoke_key", user.id(), keyId, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public PgpKey extendExpiry(AppUser user, UUID keyId, ExtendExpiryRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("extend_expiry", user.id(), keyId);
        try {
            if (!request.expiresAt().isAfter(Instant.now())) {
                throw new BadRequestException("expiresAt must be in the future");
            }
            PgpKey key = getForUser(user, keyId);
            ensureNotRevoked(key);

            PgpKey primary =
                    key.isPrimary() ? requirePrimaryWithPrivate(user, key.id()) : requirePrimaryWithPrivate(user, key.parentKeyId());
            char[] passphrase = requirePassphrase(request.passphrase());
            long targetKeyId = parseKeyId(key);

            KeyRingUpdate updated =
                    pgpCryptoService.extendExpiryInRing(
                            primary.encryptedPrivateArmored(),
                            passphrase,
                            targetKeyId,
                            request.expiresAt());

            pgpKeyRepository.updateKeyringMaterial(
                    primary.id(),
                    user.id(),
                    updated.armoredPublic(),
                    updated.armoredPrivate(),
                    null,
                    null,
                    null);

            PgpKey updatedKey =
                    pgpKeyRepository
                            .updateMetadata(key.id(), user.id(), null, request.expiresAt(), null, null)
                            .orElseThrow(() -> new KeyNotFoundException(keyId));
            operationLogger.succeeded("extend_expiry", user.id(), keyId, System.currentTimeMillis() - start);
            return updatedKey;
        } catch (RuntimeException ex) {
            operationLogger.failed("extend_expiry", user.id(), keyId, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public RotateResult rotate(AppUser user, UUID keyId, RotateKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("rotate_key", user.id(), keyId);
        try {
            PgpKey previous = getForUser(user, keyId);
            if (previous.role() != KeyRole.SUBKEY) {
                throw new BadRequestException("Rotate is only supported for subkeys");
            }
            ensureNotRevoked(previous);

            boolean revokePrevious = request.revokePrevious() == null || request.revokePrevious();
            if (revokePrevious && request.passphrase() != null) {
                revoke(
                        user,
                        keyId,
                        new RevokeKeyRequest("key_superseded", "rotated", request.passphrase()));
            } else if (revokePrevious) {
                pgpKeyRepository.markRevoked(keyId, user.id(), Instant.now(), RevocationReason.KEY_SUPERSEDED);
            }

            CreateSubkeyRequest subRequest =
                    new CreateSubkeyRequest(
                            request.capabilities(),
                            request.algorithm(),
                            request.validity(),
                            request.passphrase());
            PgpKey newKey = createSubkey(user, previous.parentKeyId(), subRequest);
            PgpKey previousUpdated = getForUser(user, keyId);
            operationLogger.succeeded("rotate_key", user.id(), newKey.id(), System.currentTimeMillis() - start);
            return new RotateResult(newKey, previousUpdated);
        } catch (RuntimeException ex) {
            operationLogger.failed("rotate_key", user.id(), keyId, ex.getClass().getSimpleName(), ex.getMessage());
            throw ex;
        }
    }

    public String exportPublic(AppUser user, UUID keyId) {
        PgpKey key = getForUser(user, keyId);
        String armored = resolveArmoredPublic(key, user);
        long targetKeyId = parseKeyId(key);
        return pgpCryptoService.exportPublicKey(armored, targetKeyId);
    }

    public record RotateResult(PgpKey newKey, PgpKey previousKey) {}

    private PgpKey generatePrimary(AppUser user, CreatePgpKeyRequest request) {
        if (request.passphrase() == null || request.passphrase().isBlank()) {
            throw new BadRequestException("passphrase is required for key generation");
        }
        if (request.algorithmSpec() == null) {
            throw new BadRequestException("algorithmSpec is required for key generation");
        }
        List<PgpCapability> capabilities =
                request.capabilities() != null
                        ? PgpKeyValidator.parseCapabilities(request.capabilities())
                        : List.of(PgpCapability.CERTIFY, PgpCapability.SIGN);
        PgpKeyValidator.validatePrimaryCapabilities(capabilities);
        Instant expiresAt = request.validity() != null ? request.validity().expiresAt() : request.expiresAt();

        GeneratedKeyMaterial material =
                pgpCryptoService.generatePrimary(
                        request.userIds(),
                        capabilities,
                        request.algorithmSpec(),
                        expiresAt,
                        request.passphrase().toCharArray());

        return insertKey(
                user,
                request.label(),
                material,
                KeyType.PRIVATE,
                KeyRole.PRIMARY,
                null,
                request.storageProvider(),
                request.storageRef());
    }

    private PgpKey registerKey(AppUser user, CreatePgpKeyRequest request) {
        if (request.fingerprint() == null || request.fingerprint().isBlank()) {
            throw new BadRequestException("fingerprint is required when registering a key");
        }
        if (request.keyType() == null || request.keyType().isBlank()) {
            throw new BadRequestException("keyType is required");
        }
        KeyType keyType = KeyType.valueOf(request.keyType().toUpperCase());
        KeyRole role = PgpKeyValidator.parseRole(request.role());
        UUID parentKeyId = request.parentKeyId() != null ? UUID.fromString(request.parentKeyId()) : null;
        if (role == KeyRole.SUBKEY && parentKeyId == null) {
            throw new BadRequestException("parentKeyId is required for subkey registration");
        }
        if (role == KeyRole.PRIMARY) {
            requirePrimaryCapabilitiesIfPresent(request);
        }

        try {
            return pgpKeyRepository.insert(
                    new PgpKeyInsert(
                            user.id(),
                            request.label(),
                            request.fingerprint().toUpperCase(),
                            request.keyId(),
                            keyType,
                            role,
                            parentKeyId,
                            request.capabilities() != null
                                    ? PgpKeyValidator.parseCapabilities(request.capabilities())
                                    : List.of(),
                            request.algorithm(),
                            null,
                            request.expiresAt(),
                            null,
                            null,
                            request.armoredPublic(),
                            request.encryptedPrivateArmored(),
                            request.storageProvider(),
                            request.storageRef()));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A key with this fingerprint already exists for your account");
        }
    }

    private PgpKey insertKey(
            AppUser user,
            String label,
            GeneratedKeyMaterial material,
            KeyType keyType,
            KeyRole role,
            UUID parentKeyId,
            String storageProvider,
            String storageRef) {
        return insertKey(
                user,
                label,
                material.fingerprint(),
                material.keyId(),
                material.algorithm(),
                material.algorithmSpecJson(),
                material.capabilities(),
                material.expiresAt(),
                material.armoredPublic(),
                material.armoredPrivate(),
                keyType,
                role,
                parentKeyId,
                storageProvider,
                storageRef);
    }

    private PgpKey insertKey(
            AppUser user,
            String label,
            SubkeyMaterial material,
            KeyType keyType,
            KeyRole role,
            UUID parentKeyId,
            String storageProvider,
            String storageRef) {
        return insertKey(
                user,
                label,
                material.fingerprint(),
                material.keyId(),
                material.algorithm(),
                material.algorithmSpecJson(),
                material.capabilities(),
                material.expiresAt(),
                material.updatedArmoredPublic(),
                material.updatedArmoredPrivate(),
                keyType,
                role,
                parentKeyId,
                storageProvider,
                storageRef);
    }

    private PgpKey insertKey(
            AppUser user,
            String label,
            String fingerprint,
            String keyId,
            String algorithm,
            String algorithmSpecJson,
            List<PgpCapability> capabilities,
            Instant expiresAt,
            String armoredPublic,
            String armoredPrivate,
            KeyType keyType,
            KeyRole role,
            UUID parentKeyId,
            String storageProvider,
            String storageRef) {
        try {
            return pgpKeyRepository.insert(
                    new PgpKeyInsert(
                            user.id(),
                            label,
                            fingerprint,
                            keyId,
                            keyType,
                            role,
                            parentKeyId,
                            capabilities,
                            algorithm,
                            algorithmSpecJson,
                            expiresAt,
                            null,
                            null,
                            armoredPublic,
                            armoredPrivate,
                            storageProvider,
                            storageRef));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A key with this fingerprint already exists for your account");
        }
    }

    private void requirePrimaryCapabilitiesIfPresent(CreatePgpKeyRequest request) {
        if (request.capabilities() != null && !request.capabilities().isEmpty()) {
            PgpKeyValidator.validatePrimaryCapabilities(PgpKeyValidator.parseCapabilities(request.capabilities()));
        }
    }

    private boolean isGenerateRequest(CreatePgpKeyRequest request) {
        return request.algorithmSpec() != null
                || (request.passphrase() != null && !request.passphrase().isBlank());
    }

    private PgpKey requirePrimary(AppUser user, UUID primaryKeyId) {
        PgpKey key = getForUser(user, primaryKeyId);
        if (key.role() != KeyRole.PRIMARY) {
            throw new BadRequestException("Key is not a primary key");
        }
        return key;
    }

    private PgpKey requirePrimaryWithPrivate(AppUser user, UUID primaryKeyId) {
        PgpKey key = requirePrimary(user, primaryKeyId);
        if (key.encryptedPrivateArmored() == null || key.encryptedPrivateArmored().isBlank()) {
            throw new BadRequestException("Primary key has no private material for cryptographic operations");
        }
        return key;
    }

    private void ensureNotRevoked(PgpKey key) {
        if (key.revokedAt() != null) {
            throw new ConflictException("Key is already revoked");
        }
    }

    private char[] requirePassphrase(String passphrase) {
        if (passphrase == null || passphrase.isBlank()) {
            throw new BadRequestException("passphrase is required for this operation");
        }
        return passphrase.toCharArray();
    }

    private long parseKeyId(PgpKey key) {
        return org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport.parseKeyIdHex(key.keyId());
    }

    private String resolveArmoredPublic(PgpKey key, AppUser user) {
        if (key.armoredPublic() != null && !key.armoredPublic().isBlank()) {
            return key.armoredPublic();
        }
        if (key.parentKeyId() != null) {
            PgpKey primary = getForUser(user, key.parentKeyId());
            if (primary.armoredPublic() != null) {
                return primary.armoredPublic();
            }
        }
        throw new BadRequestException("No public key material available for export");
    }

    private int revocationReasonCode(RevocationReason reason) {
        return switch (reason) {
            case NO_REASON -> 0;
            case KEY_SUPERSEDED -> 1;
            case KEY_COMPROMISED -> 2;
            case KEY_RETIRED -> 3;
            case USER_ID_INVALID -> 32;
        };
    }
}
