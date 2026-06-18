package org.bruneel.pgpkeymanager.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.StorageConnection;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.StorageConnectionService;
import org.bruneel.pgpkeymanager.web.dto.CreateStorageConnectionRequest;
import org.bruneel.pgpkeymanager.web.dto.StorageConnectionResponse;
import org.bruneel.pgpkeymanager.web.dto.UpdateStorageConnectionRequest;

@RestController
@RequestMapping(path = "/api/storage-connections", produces = MediaType.APPLICATION_JSON_VALUE)
public class StorageConnectionController {

    private final CurrentUserService currentUserService;
    private final StorageConnectionService storageConnectionService;

    public StorageConnectionController(
            CurrentUserService currentUserService, StorageConnectionService storageConnectionService) {
        this.currentUserService = currentUserService;
        this.storageConnectionService = storageConnectionService;
    }

    @GetMapping
    public List<StorageConnectionResponse> list(Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return storageConnectionService.listConnections(user).stream()
                .map(StorageConnectionResponse::from)
                .toList();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public StorageConnectionResponse create(
            @Valid @RequestBody CreateStorageConnectionRequest request, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        StorageConnection created =
                storageConnectionService.createConnection(
                        user,
                        request.displayName(),
                        request.region(),
                        request.bucket(),
                        request.prefix(),
                        request.roleArn());
        return StorageConnectionResponse.from(created);
    }

    @GetMapping("/{connectionId}")
    public StorageConnectionResponse get(@PathVariable UUID connectionId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return StorageConnectionResponse.from(storageConnectionService.getConnection(user, connectionId));
    }

    @PatchMapping(path = "/{connectionId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StorageConnectionResponse update(
            @PathVariable UUID connectionId,
            @Valid @RequestBody UpdateStorageConnectionRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        StorageConnection updated =
                storageConnectionService.updateConnection(
                        user,
                        connectionId,
                        request.displayName(),
                        request.region(),
                        request.bucket(),
                        request.prefix(),
                        request.roleArn());
        return StorageConnectionResponse.from(updated);
    }

    @DeleteMapping("/{connectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID connectionId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        storageConnectionService.deleteConnection(user, connectionId);
    }
}
