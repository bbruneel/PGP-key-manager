package org.bruneel.pgpkeymanager.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.PgpKey;
import org.bruneel.pgpkeymanager.domain.PgpKey.KeyType;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;
import org.bruneel.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

@Service
public class PgpKeyService {

    private final PgpKeyRepository pgpKeyRepository;

    public PgpKeyService(PgpKeyRepository pgpKeyRepository) {
        this.pgpKeyRepository = pgpKeyRepository;
    }

    public List<PgpKey> listForUser(AppUser user) {
        return pgpKeyRepository.findAllByUserId(user.id());
    }

    public PgpKey getForUser(AppUser user, UUID id) {
        return pgpKeyRepository
                .findByIdAndUserId(id, user.id())
                .orElseThrow(() -> new KeyNotFoundException(id));
    }

    public PgpKey create(AppUser user, CreatePgpKeyRequest request) {
        KeyType keyType = KeyType.valueOf(request.keyType().toUpperCase());
        try {
            return pgpKeyRepository.insert(
                    user.id(),
                    request.label(),
                    request.fingerprint(),
                    request.keyId(),
                    keyType,
                    request.algorithm(),
                    request.expiresAt(),
                    request.armoredPublic(),
                    request.encryptedPrivateArmored(),
                    request.storageProvider(),
                    request.storageRef());
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A key with this fingerprint already exists for your account");
        }
    }

    public PgpKey update(AppUser user, UUID id, UpdatePgpKeyRequest request) {
        return pgpKeyRepository
                .update(
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
}
