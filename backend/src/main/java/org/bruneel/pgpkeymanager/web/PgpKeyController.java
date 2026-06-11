package org.bruneel.pgpkeymanager.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.KeyRole;
import org.bruneel.pgpkeymanager.domain.PgpCapability;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.PgpKeyService;
import org.bruneel.pgpkeymanager.service.PgpKeyValidator;
import org.bruneel.pgpkeymanager.service.PgpKeyService.RotateResult;
import org.bruneel.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.CreateSubkeyRequest;
import org.bruneel.pgpkeymanager.web.dto.ExtendExpiryRequest;
import org.bruneel.pgpkeymanager.web.dto.ImportSubkeysResponse;
import org.bruneel.pgpkeymanager.web.dto.PgpKeyResponse;
import org.bruneel.pgpkeymanager.web.dto.PreviewImportSubkeysResponse;
import org.bruneel.pgpkeymanager.web.dto.PreviewKeyringResponse;
import org.bruneel.pgpkeymanager.web.dto.RevokeKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.RotateKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.RotateKeyResponse;
import org.bruneel.pgpkeymanager.web.dto.UpdatePgpKeyRequest;

@RestController
@RequestMapping(path = "/api/keys", produces = MediaType.APPLICATION_JSON_VALUE)
public class PgpKeyController {

    private final CurrentUserService currentUserService;
    private final PgpKeyService pgpKeyService;

    public PgpKeyController(CurrentUserService currentUserService, PgpKeyService pgpKeyService) {
        this.currentUserService = currentUserService;
        this.pgpKeyService = pgpKeyService;
    }

    @GetMapping
    public List<PgpKeyResponse> list(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String capability,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        KeyRole keyRole = role != null ? KeyRole.fromDb(role) : null;
        PgpCapability cap = capability != null ? PgpKeyValidator.parseCapabilityParam(capability) : null;
        return pgpKeyService.listForUser(user, keyRole, status, cap).stream()
                .map(key -> PgpKeyResponse.from(key, false))
                .toList();
    }

    @GetMapping("/{keyId}")
    public PgpKeyResponse get(@PathVariable UUID keyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.getForUser(user, keyId), true);
    }

    @PostMapping(path = "/preview", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PreviewKeyringResponse previewKeyring(
            @Valid @RequestBody CreatePgpKeyRequest request, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return pgpKeyService.previewKeyring(user, request);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PgpKeyResponse create(
            @Valid @RequestBody CreatePgpKeyRequest request, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        var outcome = pgpKeyService.create(user, request);
        return PgpKeyResponse.from(outcome.key(), true, outcome.registeredSubkeyCount());
    }

    @PatchMapping(path = "/{keyId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PgpKeyResponse update(
            @PathVariable UUID keyId,
            @Valid @RequestBody UpdatePgpKeyRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.update(user, keyId, request), true);
    }

    @DeleteMapping("/{keyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID keyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        pgpKeyService.delete(user, keyId);
    }

    @GetMapping("/{primaryKeyId}/subkeys")
    public List<PgpKeyResponse> listSubkeys(
            @PathVariable UUID primaryKeyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return pgpKeyService.listSubkeys(user, primaryKeyId).stream()
                .map(key -> PgpKeyResponse.from(key, false))
                .toList();
    }

    @PostMapping(path = "/{primaryKeyId}/subkeys", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PgpKeyResponse createSubkey(
            @PathVariable UUID primaryKeyId,
            @Valid @RequestBody CreateSubkeyRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.createSubkey(user, primaryKeyId, request), false);
    }

    @PostMapping("/{primaryKeyId}/subkeys/import-from-keyring/preview")
    public PreviewImportSubkeysResponse previewImportSubkeysFromKeyring(
            @PathVariable UUID primaryKeyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return pgpKeyService.previewImportSubkeysFromKeyring(user, primaryKeyId);
    }

    @PostMapping("/{primaryKeyId}/subkeys/import-from-keyring")
    public ResponseEntity<ImportSubkeysResponse> importSubkeysFromKeyring(
            @PathVariable UUID primaryKeyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        var result = pgpKeyService.importSubkeysFromKeyring(user, primaryKeyId);
        ImportSubkeysResponse body = ImportSubkeysResponse.from(result);
        if (result.registered().isEmpty()) {
            return ResponseEntity.ok(body);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/{primaryKeyId}/subkeys/{subkeyId}")
    public PgpKeyResponse getSubkey(
            @PathVariable UUID primaryKeyId,
            @PathVariable UUID subkeyId,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.getSubkey(user, primaryKeyId, subkeyId), false);
    }

    @PostMapping(path = "/{keyId}/revoke", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PgpKeyResponse revoke(
            @PathVariable UUID keyId,
            @Valid @RequestBody RevokeKeyRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.revoke(user, keyId, request), true);
    }

    @PostMapping(path = "/{keyId}/extend-expiry", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PgpKeyResponse extendExpiry(
            @PathVariable UUID keyId,
            @Valid @RequestBody ExtendExpiryRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.extendExpiry(user, keyId, request), true);
    }

    @PostMapping(path = "/{keyId}/rotate", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RotateKeyResponse rotate(
            @PathVariable UUID keyId,
            @Valid @RequestBody RotateKeyRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        RotateResult result = pgpKeyService.rotate(user, keyId, request);
        return new RotateKeyResponse(
                PgpKeyResponse.from(result.newKey(), false),
                PgpKeyResponse.from(result.previousKey(), false));
    }

    @GetMapping(path = "/{keyId}/export-public", produces = {MediaType.TEXT_PLAIN_VALUE, "application/pgp-keys"})
    public ResponseEntity<String> exportPublic(@PathVariable UUID keyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        String armored = pgpKeyService.exportPublic(user, keyId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/pgp-keys"))
                .body(armored);
    }

    @GetMapping(path = "/{keyId}/export-ssh-public", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> exportSshPublic(@PathVariable UUID keyId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        String sshLine = pgpKeyService.exportSshPublic(user, keyId);
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(sshLine);
    }
}
