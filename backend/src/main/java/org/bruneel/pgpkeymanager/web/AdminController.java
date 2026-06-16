package org.bruneel.pgpkeymanager.web;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.repo.AppUserRepository;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.PlatformAdminService;
import org.bruneel.pgpkeymanager.web.dto.AdminGroupResponse;
import org.bruneel.pgpkeymanager.web.dto.AdminUserResponse;

@RestController
@RequestMapping(path = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminController {

    private final CurrentUserService currentUserService;
    private final PlatformAdminService platformAdminService;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PgpKeyRepository pgpKeyRepository;
    private final AppUserRepository appUserRepository;

    public AdminController(
            CurrentUserService currentUserService,
            PlatformAdminService platformAdminService,
            GroupRepository groupRepository,
            GroupMemberRepository groupMemberRepository,
            PgpKeyRepository pgpKeyRepository,
            AppUserRepository appUserRepository) {
        this.currentUserService = currentUserService;
        this.platformAdminService = platformAdminService;
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.pgpKeyRepository = pgpKeyRepository;
        this.appUserRepository = appUserRepository;
    }

    @GetMapping("/groups")
    public List<AdminGroupResponse> listGroups(Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        platformAdminService.requirePlatformAdmin(user);
        return groupRepository.findAll().stream()
                .map(group -> AdminGroupResponse.from(
                        group,
                        groupMemberRepository.countByGroupId(group.id()),
                        pgpKeyRepository.countByOwnerGroupId(group.id())))
                .toList();
    }

    @GetMapping("/users")
    public List<AdminUserResponse> listUsers(Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        platformAdminService.requirePlatformAdmin(user);
        return appUserRepository.findAll().stream().map(AdminUserResponse::from).toList();
    }
}
