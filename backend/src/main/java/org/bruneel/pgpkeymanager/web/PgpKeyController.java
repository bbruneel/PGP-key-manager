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
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.PgpKeyService;
import org.bruneel.pgpkeymanager.web.dto.CreatePgpKeyRequest;
import org.bruneel.pgpkeymanager.web.dto.PgpKeyResponse;
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
    public List<PgpKeyResponse> list(Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return pgpKeyService.listForUser(user).stream()
                .map(key -> PgpKeyResponse.from(key, false))
                .toList();
    }

    @GetMapping("/{id}")
    public PgpKeyResponse get(@PathVariable UUID id, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.getForUser(user, id), true);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PgpKeyResponse create(
            @Valid @RequestBody CreatePgpKeyRequest request, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.create(user, request), true);
    }

    @PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PgpKeyResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePgpKeyRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return PgpKeyResponse.from(pgpKeyService.update(user, id, request), true);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        pgpKeyService.delete(user, id);
    }
}
