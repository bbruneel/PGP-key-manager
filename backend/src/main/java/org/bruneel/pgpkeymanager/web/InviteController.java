package org.bruneel.pgpkeymanager.web;

import jakarta.validation.constraints.NotBlank;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.GroupService;
import org.bruneel.pgpkeymanager.web.dto.AcceptInviteResponse;

@RestController
@RequestMapping(path = "/api/invites", produces = MediaType.APPLICATION_JSON_VALUE)
public class InviteController {

    private final CurrentUserService currentUserService;
    private final GroupService groupService;

    public InviteController(CurrentUserService currentUserService, GroupService groupService) {
        this.currentUserService = currentUserService;
        this.groupService = groupService;
    }

    @PostMapping("/{token}/accept")
    public AcceptInviteResponse accept(@PathVariable @NotBlank String token, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return AcceptInviteResponse.from(groupService.acceptInvite(user, token));
    }
}
