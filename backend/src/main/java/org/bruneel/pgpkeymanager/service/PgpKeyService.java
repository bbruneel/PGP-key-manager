package org.bruneel.pgpkeymanager.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.bruneel.pgpkeymanager.crypto.GeneratedKeyMaterial;
import org.bruneel.pgpkeymanager.crypto.ImportedKeyMetadata;
import org.bruneel.pgpkeymanager.crypto.ImportedKeyringMetadata;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoService;
import org.bruneel.pgpkeymanager.crypto.PgpCryptoSupport;
import org.bruneel.pgpkeymanager.crypto.PgpKeyMetadataParser;
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
import org.bruneel.pgpkeymanager.web.dto.PreviewImportSubkeysResponse;
import org.bruneel.pgpkeymanager.web.dto.PreviewKeyEntry;
import org.bruneel.pgpkeymanager.web.dto.PreviewKeyringResponse;
import org.bruneel.pgpkeymanager.web.dto.RevokeKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.RotateKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class PgpKeyService {

    private static final Logger log = LoggerFactory.getLogger(PgpKeyService.class);

    private final PgpKeyRepository pgpKeyRepository;
    private final PgpCryptoService pgpCryptoService;
    private final PgpKeyMetadataParser metadataParser;
    private final KeyOperationLogger operationLogger;
    private final KeyOperationMetrics operationMetrics;

    public PgpKeyService(
            PgpKeyRepository pgpKeyRepository,
            PgpCryptoService pgpCryptoService,
            PgpKeyMetadataParser metadataParser,
            KeyOperationLogger operationLogger,
            KeyOperationMetrics operationMetrics) {
        this.pgpKeyRepository = pgpKeyRepository;
        this.pgpCryptoService = pgpCryptoService;
        this.metadataParser = metadataParser;
        this.operationLogger = operationLogger;
        this.operationMetrics = operationMetrics;
    }

    public List<PgpKey> listForUser(AppUser user, KeyRole role, String status, PgpCapability capability) {
        return pgpKeyRepository.findAllByUserId(user.id(), role, status, capability);
    }

    public PgpKey getForUser(AppUser user, UUID id) {
        return pgpKeyRepository
                .findByIdAndUserId(id, user.id())
                .orElseThrow(() -> new KeyNotFoundException(id));
    }

    public CreateKeyOutcome create(AppUser user, CreatePgpKeyRequest request) {
        long start = System.currentTimeMillis();
        boolean generate = isGenerateRequest(request);
        String operation = generate ? "create_key" : "register_key";
        int openpgpVersion =
                generate
                        ? PgpKeyValidator.normalizeOpenpgpVersion(request.openpgpVersion())
                        : PgpKeyValidator.OPENPGP_V4;
        operationLogger.started(operation, user.id(), null, openpgpVersion);
        try {
            CreateKeyOutcome outcome =
                    generate ? new CreateKeyOutcome(generatePrimary(user, request), null) : registerKey(user, request);
            completeSuccess(operation, user.id(), outcome.key().id(), outcome.key().openpgpVersion(), start);
            if (generate) {
                operationMetrics.recordVersionGenerated(outcome.key().openpgpVersion());
            }
            return outcome;
        } catch (RuntimeException ex) {
            completeFailure(operation, user.id(), null, openpgpVersion, start, ex);
            throw ex;
        }
    }

    public PreviewKeyringResponse previewKeyring(AppUser user, CreatePgpKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("preview_keyring", user.id(), null, PgpKeyValidator.OPENPGP_V4);
        try {
            PgpKeyValidator.rejectOpenpgpVersionOnRegister(request.openpgpVersion());
            ImportedKeyringMetadata keyring =
                    metadataParser.parseKeyring(request.armoredPublic(), request.encryptedPrivateArmored());
            metadataParser.validateFingerprintMatch(keyring.primary(), request.fingerprint());
            PreviewKeyringResponse response = PreviewKeyringResponse.from(keyring);
            log.info(
                    "preview_keyring_completed subkeyCount={} warningCount={} source={} revokedSubkeyCount={}",
                    response.subkeys().size(),
                    response.warnings().size(),
                    response.source(),
                    response.subkeys().stream().filter(entry -> entry.revokedAt() != null).count());
            completeSuccess("preview_keyring", user.id(), null, keyring.primary().openpgpVersion(), start);
            return response;
        } catch (RuntimeException ex) {
            completeFailure("preview_keyring", user.id(), null, PgpKeyValidator.OPENPGP_V4, start, ex);
            throw ex;
        }
    }

    /** Preview subkey register/sync/skip actions. Primary revocation is not included. */
    public PreviewImportSubkeysResponse previewImportSubkeysFromKeyring(AppUser user, UUID primaryKeyId) {
        long start = System.currentTimeMillis();
        PgpKey primary = requirePrimary(user, primaryKeyId);
        int openpgpVersion = primary.openpgpVersion();
        operationLogger.started("preview_import_subkeys_from_keyring", user.id(), primaryKeyId, null, openpgpVersion);
        try {
            PreviewImportSubkeysResponse response = buildImportSubkeysPreview(user, primary);
            log.info(
                    "preview_import_subkeys_from_keyring_completed parentKeyId={} wouldRegister={} wouldUpdate={} wouldSkip={}",
                    primaryKeyId,
                    response.wouldRegister().size(),
                    response.wouldUpdate().size(),
                    response.wouldSkipCount());
            completeSuccess("preview_import_subkeys_from_keyring", user.id(), primaryKeyId, openpgpVersion, start);
            return response;
        } catch (RuntimeException ex) {
            completeFailure("preview_import_subkeys_from_keyring", user.id(), primaryKeyId, openpgpVersion, start, ex);
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

    /**
     * Registers missing subkey rows and syncs revocation for existing subkeys from the stored
     * keyring. Does not update the primary row — primary revocation is applied on initial
     * register when armored material is parsed.
     */
    public ImportSubkeysResult importSubkeysFromKeyring(AppUser user, UUID primaryKeyId) {
        long start = System.currentTimeMillis();
        PgpKey primary = requirePrimary(user, primaryKeyId);
        int openpgpVersion = primary.openpgpVersion();
        operationLogger.started("import_subkeys_from_keyring", user.id(), primaryKeyId, null, openpgpVersion);
        try {
            String armoredPublic = primary.armoredPublic();
            String armoredPrivate = primary.encryptedPrivateArmored();
            if ((armoredPublic == null || armoredPublic.isBlank())
                    && (armoredPrivate == null || armoredPrivate.isBlank())) {
                throw new BadRequestException("Primary key has no armored keyring material to import subkeys from");
            }

            ImportedKeyringMetadata keyring = metadataParser.parseKeyring(armoredPublic, armoredPrivate);
            ImportSubkeysResult result =
                    registerImportedSubkeys(user, primary, keyring.subkeys(), primary.keyType());
            log.info(
                    "import_subkeys_from_keyring_completed parentKeyId={} registeredCount={} skippedCount={} updatedCount={} fingerprints={}",
                    primaryKeyId,
                    result.registered().size(),
                    result.skippedCount(),
                    result.updated().size(),
                    result.registered().stream().map(PgpKey::fingerprint).toList());
            if (!result.updated().isEmpty()) {
                log.info(
                        "import_subkeys_from_keyring_synced parentKeyId={} fingerprints={}",
                        primaryKeyId,
                        result.updated().stream().map(PgpKey::fingerprint).toList());
            }
            completeSuccess(
                    "import_subkeys_from_keyring", user.id(), primaryKeyId, openpgpVersion, start);
            return result;
        } catch (RuntimeException ex) {
            completeFailure("import_subkeys_from_keyring", user.id(), primaryKeyId, openpgpVersion, start, ex);
            throw ex;
        }
    }

    public PgpKey createSubkey(AppUser user, UUID primaryKeyId, CreateSubkeyRequest request) {
        long start = System.currentTimeMillis();
        PgpKey primary = requirePrimaryWithPrivate(user, primaryKeyId);
        int openpgpVersion = primary.openpgpVersion();
        PgpKeyValidator.validateSubkeyRequest(request, openpgpVersion);
        operationLogger.started("create_subkey", user.id(), primaryKeyId, null, openpgpVersion);
        try {
            List<PgpCapability> capabilities = PgpKeyValidator.parseCapabilities(request.capabilities());
            Instant expiresAt = request.validity() != null ? request.validity().expiresAt() : null;
            char[] passphrase = PassphraseUtil.require(request.passphrase());
            SubkeyMaterial material;
            try {
                material =
                        pgpCryptoService.addSubkey(
                                openpgpVersion,
                                primary.encryptedPrivateArmored(),
                                passphrase,
                                capabilities,
                                request.algorithm(),
                                expiresAt);
            } finally {
                PassphraseUtil.wipe(passphrase);
            }

            pgpKeyRepository.updateKeyringMaterial(
                    primary.id(),
                    user.id(),
                    material.updatedArmoredPublic(),
                    material.updatedArmoredPrivate(),
                    null,
                    null,
                    null);

            PgpKey subkey =
                    insertSubkeyRow(
                            user,
                            primary.label(),
                            material,
                            primary.id(),
                            openpgpVersion,
                            primary.storageProvider(),
                            primary.storageRef());

            completeSuccess("create_subkey", user.id(), subkey.id(), openpgpVersion, start);
            operationMetrics.recordVersionGenerated(openpgpVersion);
            return subkey;
        } catch (RuntimeException ex) {
            completeFailure("create_subkey", user.id(), primaryKeyId, openpgpVersion, start, ex);
            throw ex;
        }
    }

    public PgpKey revoke(AppUser user, UUID keyId, RevokeKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("revoke_key", user.id(), keyId);
        int openpgpVersion = PgpKeyValidator.OPENPGP_V4;
        try {
            PgpKey key = getForUser(user, keyId);
            ensureNotRevoked(key);
            RevocationReason reason = parseRevocationReason(request.reason());
            Instant revokedAt = Instant.now();

            PgpKey primaryForRing =
                    key.isPrimary() ? key : (key.parentKeyId() != null ? getForUser(user, key.parentKeyId()) : null);
            boolean primaryHasPrivate =
                    primaryForRing != null && hasPrivateMaterial(primaryForRing);

            if (primaryHasPrivate) {
                char[] passphrase = PassphraseUtil.require(request.passphrase());
                try {
                    PgpKey primary = requirePrimaryWithPrivate(user, primaryForRing.id());
                    openpgpVersion = primary.openpgpVersion();
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
                            key.isPrimary() ? revokedAt : null,
                            key.isPrimary() ? reason : null);
                } finally {
                    PassphraseUtil.wipe(passphrase);
                }
            } else if (request.passphrase() != null && !request.passphrase().isBlank()) {
                throw new BadRequestException(
                        "Passphrase was provided but no primary private key material is stored; "
                                + "revocation is recorded as metadata only");
            }

            PgpKey revoked =
                    pgpKeyRepository
                            .markRevoked(key.id(), user.id(), revokedAt, reason)
                            .orElseThrow(() -> new KeyNotFoundException(keyId));
            completeSuccess("revoke_key", user.id(), keyId, openpgpVersion, start);
            return revoked;
        } catch (RuntimeException ex) {
            completeFailure("revoke_key", user.id(), keyId, openpgpVersion, start, ex);
            throw ex;
        }
    }

    public PgpKey extendExpiry(AppUser user, UUID keyId, ExtendExpiryRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("extend_expiry", user.id(), keyId);
        int openpgpVersion = PgpKeyValidator.OPENPGP_V4;
        try {
            if (!request.expiresAt().isAfter(Instant.now())) {
                throw new BadRequestException("expiresAt must be in the future");
            }
            PgpKey key = getForUser(user, keyId);
            ensureNotRevoked(key);

            PgpKey primary =
                    key.isPrimary() ? requirePrimaryWithPrivate(user, key.id()) : requirePrimaryWithPrivate(user, key.parentKeyId());
            openpgpVersion = primary.openpgpVersion();
            char[] passphrase = PassphraseUtil.require(request.passphrase());
            long targetKeyId = parseKeyId(key);
            KeyRingUpdate updated;
            try {
                updated =
                        pgpCryptoService.extendExpiryInRing(
                                primary.encryptedPrivateArmored(),
                                passphrase,
                                targetKeyId,
                                request.expiresAt());
            } finally {
                PassphraseUtil.wipe(passphrase);
            }

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
            completeSuccess("extend_expiry", user.id(), keyId, openpgpVersion, start);
            return updatedKey;
        } catch (RuntimeException ex) {
            completeFailure("extend_expiry", user.id(), keyId, openpgpVersion, start, ex);
            throw ex;
        }
    }

    public RotateResult rotate(AppUser user, UUID keyId, RotateKeyRequest request) {
        long start = System.currentTimeMillis();
        operationLogger.started("rotate_key", user.id(), keyId);
        int openpgpVersion = PgpKeyValidator.OPENPGP_V4;
        try {
            PgpKey previous = getForUser(user, keyId);
            if (previous.parentKeyId() != null) {
                openpgpVersion = requirePrimary(user, previous.parentKeyId()).openpgpVersion();
            }
            if (previous.role() != KeyRole.SUBKEY) {
                throw new BadRequestException("Rotate is only supported for subkeys");
            }
            ensureNotRevoked(previous);

            boolean revokePrevious = request.revokePrevious() == null || request.revokePrevious();
            if (revokePrevious && (request.passphrase() == null || request.passphrase().isBlank())) {
                throw new BadRequestException("passphrase is required when revokePrevious is true");
            }
            if (revokePrevious) {
                revoke(
                        user,
                        keyId,
                        new RevokeKeyRequest("key_superseded", "rotated", request.passphrase()));
            }

            CreateSubkeyRequest subRequest =
                    new CreateSubkeyRequest(
                            request.capabilities(),
                            request.algorithm(),
                            request.validity(),
                            request.passphrase());
            PgpKey newKey = createSubkey(user, previous.parentKeyId(), subRequest);
            PgpKey previousUpdated = getForUser(user, keyId);
            completeSuccess("rotate_key", user.id(), newKey.id(), openpgpVersion, start);
            return new RotateResult(newKey, previousUpdated);
        } catch (RuntimeException ex) {
            completeFailure("rotate_key", user.id(), keyId, openpgpVersion, start, ex);
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
        int openpgpVersion = PgpKeyValidator.normalizeOpenpgpVersion(request.openpgpVersion());
        PgpKeyValidator.validatePrimaryAlgorithm(request.algorithmSpec(), openpgpVersion);
        log.info(
                "create_key_algorithm algorithm={} keySize={} curve={} openpgpVersion={}",
                request.algorithmSpec().algorithm(),
                request.algorithmSpec().keySize(),
                request.algorithmSpec().curve(),
                openpgpVersion);

        char[] passphrase = PassphraseUtil.require(request.passphrase());
        GeneratedKeyMaterial material;
        try {
            material =
                    pgpCryptoService.generatePrimary(
                            openpgpVersion,
                            request.userIds(),
                            capabilities,
                            request.algorithmSpec(),
                            expiresAt,
                            passphrase);
        } finally {
            PassphraseUtil.wipe(passphrase);
        }

        return insertKey(
                user,
                request.label(),
                material,
                KeyType.PRIVATE,
                KeyRole.PRIMARY,
                null,
                openpgpVersion,
                request.storageProvider(),
                request.storageRef());
    }

    private CreateKeyOutcome registerKey(AppUser user, CreatePgpKeyRequest request) {
        PgpKeyValidator.rejectOpenpgpVersionOnRegister(request.openpgpVersion());
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
            return registerPrimaryKey(user, request, keyType);
        }
        return new CreateKeyOutcome(registerSubkey(user, request, keyType, parentKeyId), null);
    }

    private CreateKeyOutcome registerPrimaryKey(AppUser user, CreatePgpKeyRequest request, KeyType keyType) {
        ImportedKeyringMetadata keyring =
                metadataParser.parseKeyring(request.armoredPublic(), request.encryptedPrivateArmored());
        ImportedKeyMetadata metadata = keyring.primary();
        metadataParser.validateFingerprintMatch(metadata, request.fingerprint());

        PgpKey primary;
        try {
            primary =
                    pgpKeyRepository.insert(
                            new PgpKeyInsert(
                                    user.id(),
                                    request.label(),
                                    metadata.fingerprint(),
                                    metadata.keyId(),
                                    keyType,
                                    KeyRole.PRIMARY,
                                    null,
                                    metadata.capabilities(),
                                    metadata.algorithm(),
                                    metadata.algorithmSpecJson(),
                                    metadata.expiresAt(),
                                    metadata.revokedAt(),
                                    metadata.revocationReason(),
                                    request.armoredPublic(),
                                    request.encryptedPrivateArmored(),
                                    request.storageProvider(),
                                    request.storageRef(),
                                    metadata.openpgpVersion()));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A key with this fingerprint already exists for your account");
        }

        int registeredSubkeyCount = 0;
        if (!keyring.subkeys().isEmpty()) {
            ImportSubkeysResult importResult = registerImportedSubkeys(user, primary, keyring.subkeys(), keyType);
            registeredSubkeyCount = importResult.registered().size();
        }
        return new CreateKeyOutcome(primary, registeredSubkeyCount);
    }

    private ImportSubkeysResult registerImportedSubkeys(
            AppUser user, PgpKey primary, List<ImportedKeyMetadata> subkeys, KeyType keyType) {
        Map<String, PgpKey> existingByFingerprint = new HashMap<>();
        for (PgpKey existing : pgpKeyRepository.findSubkeysByParentId(primary.id(), user.id())) {
            existingByFingerprint.put(existing.fingerprint().toUpperCase(), existing);
        }

        List<PgpKey> registered = new ArrayList<>();
        List<PgpKey> updated = new ArrayList<>();
        int skippedCount = 0;
        int revokedRegisteredCount = 0;
        for (ImportedKeyMetadata subkey : subkeys) {
            String fingerprint = subkey.fingerprint().toUpperCase();
            PgpKey existing = existingByFingerprint.get(fingerprint);
            if (existing != null) {
                if (existing.revokedAt() == null && subkey.revokedAt() != null) {
                    RevocationReason reason =
                            subkey.revocationReason() != null
                                    ? subkey.revocationReason()
                                    : RevocationReason.NO_REASON;
                    PgpKey synced =
                            pgpKeyRepository
                                    .markRevoked(existing.id(), user.id(), subkey.revokedAt(), reason)
                                    .orElseThrow(() -> new KeyNotFoundException(existing.id()));
                    updated.add(synced);
                    existingByFingerprint.put(fingerprint, synced);
                } else {
                    skippedCount++;
                }
                continue;
            }
            PgpKey inserted = insertImportedSubkeyRow(user, primary, subkey, keyType);
            registered.add(inserted);
            if (subkey.revokedAt() != null) {
                revokedRegisteredCount++;
            }
            existingByFingerprint.put(fingerprint, inserted);
        }

        log.info(
                "register_imported_subkeys_completed parentKeyId={} registeredCount={} skippedCount={} updatedCount={} revokedRegisteredCount={} fingerprints={}",
                primary.id(),
                registered.size(),
                skippedCount,
                updated.size(),
                revokedRegisteredCount,
                registered.stream().map(PgpKey::fingerprint).toList());

        return new ImportSubkeysResult(List.copyOf(registered), skippedCount, List.copyOf(updated));
    }

    private PgpKey insertImportedSubkeyRow(
            AppUser user, PgpKey primary, ImportedKeyMetadata metadata, KeyType keyType) {
        return insertKey(
                user,
                primary.label(),
                metadata.fingerprint(),
                metadata.keyId(),
                metadata.algorithm(),
                metadata.algorithmSpecJson(),
                metadata.capabilities(),
                metadata.expiresAt(),
                metadata.revokedAt(),
                metadata.revocationReason(),
                null,
                null,
                keyType,
                KeyRole.SUBKEY,
                primary.id(),
                primary.openpgpVersion(),
                primary.storageProvider(),
                primary.storageRef());
    }

    private PgpKey registerSubkey(
            AppUser user, CreatePgpKeyRequest request, KeyType keyType, UUID parentKeyId) {
        if (request.fingerprint() == null || request.fingerprint().isBlank()) {
            throw new BadRequestException("fingerprint is required when registering a subkey");
        }
        int openpgpVersion = getForUser(user, parentKeyId).openpgpVersion();

        try {
            return pgpKeyRepository.insert(
                    new PgpKeyInsert(
                            user.id(),
                            request.label(),
                            request.fingerprint().toUpperCase(),
                            request.keyId(),
                            keyType,
                            KeyRole.SUBKEY,
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
                            request.storageRef(),
                            openpgpVersion));
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
            int openpgpVersion,
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
                null,
                null,
                material.armoredPublic(),
                material.armoredPrivate(),
                keyType,
                role,
                parentKeyId,
                openpgpVersion,
                storageProvider,
                storageRef);
    }

    private PgpKey insertSubkeyRow(
            AppUser user,
            String label,
            SubkeyMaterial material,
            UUID parentKeyId,
            int openpgpVersion,
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
                null,
                null,
                null,
                null,
                KeyType.PRIVATE,
                KeyRole.SUBKEY,
                parentKeyId,
                openpgpVersion,
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
            Instant revokedAt,
            RevocationReason revocationReason,
            String armoredPublic,
            String armoredPrivate,
            KeyType keyType,
            KeyRole role,
            UUID parentKeyId,
            int openpgpVersion,
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
                            revokedAt,
                            revocationReason,
                            armoredPublic,
                            armoredPrivate,
                            storageProvider,
                            storageRef,
                            openpgpVersion));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A key with this fingerprint already exists for your account");
        }
    }

    private void completeSuccess(String operation, UUID userId, UUID keyId, int openpgpVersion, long startMs) {
        long durationMs = System.currentTimeMillis() - startMs;
        operationLogger.succeeded(operation, userId, keyId, openpgpVersion, durationMs);
        operationMetrics.recordSuccess(operation, openpgpVersion, durationMs);
    }

    private void completeFailure(
            String operation, UUID userId, UUID keyId, int openpgpVersion, long startMs, RuntimeException ex) {
        long durationMs = System.currentTimeMillis() - startMs;
        operationLogger.failed(operation, userId, keyId, openpgpVersion, ex.getClass().getSimpleName(), ex.getMessage());
        operationMetrics.recordFailure(operation, openpgpVersion, durationMs);
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

    private RevocationReason parseRevocationReason(String reason) {
        try {
            return RevocationReason.fromApi(reason);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    private boolean hasPrivateMaterial(PgpKey key) {
        return key.encryptedPrivateArmored() != null && !key.encryptedPrivateArmored().isBlank();
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

    private PreviewImportSubkeysResponse buildImportSubkeysPreview(AppUser user, PgpKey primary) {
        String armoredPublic = primary.armoredPublic();
        String armoredPrivate = primary.encryptedPrivateArmored();
        if ((armoredPublic == null || armoredPublic.isBlank())
                && (armoredPrivate == null || armoredPrivate.isBlank())) {
            throw new BadRequestException("Primary key has no armored keyring material to import subkeys from");
        }

        ImportedKeyringMetadata keyring = metadataParser.parseKeyring(armoredPublic, armoredPrivate);
        Map<String, PgpKey> existingByFingerprint = new HashMap<>();
        for (PgpKey existing : pgpKeyRepository.findSubkeysByParentId(primary.id(), user.id())) {
            existingByFingerprint.put(existing.fingerprint().toUpperCase(), existing);
        }

        List<PreviewKeyEntry> wouldRegister = new ArrayList<>();
        List<PreviewKeyEntry> wouldUpdate = new ArrayList<>();
        int wouldSkipCount = 0;
        for (ImportedKeyMetadata subkey : keyring.subkeys()) {
            PgpKey existing = existingByFingerprint.get(subkey.fingerprint().toUpperCase());
            if (existing == null) {
                wouldRegister.add(PreviewKeyEntry.from(subkey, KeyRole.SUBKEY));
            } else if (existing.revokedAt() == null && subkey.revokedAt() != null) {
                wouldUpdate.add(PreviewKeyEntry.from(subkey, KeyRole.SUBKEY));
            } else {
                wouldSkipCount++;
            }
        }

        return new PreviewImportSubkeysResponse(
                List.copyOf(wouldRegister),
                List.copyOf(wouldUpdate),
                wouldSkipCount,
                keyring.warnings(),
                keyring.source());
    }
}
