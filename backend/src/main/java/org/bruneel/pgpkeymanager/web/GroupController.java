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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.GroupService;
import org.bruneel.pgpkeymanager.web.dto.CreateGroupInviteRequest;
import org.bruneel.pgpkeymanager.web.dto.CreateGroupRequest;
import org.bruneel.pgpkeymanager.web.dto.GroupInviteResponse;
import org.bruneel.pgpkeymanager.web.dto.GroupMemberResponse;
import org.bruneel.pgpkeymanager.web.dto.GroupResponse;
import org.bruneel.pgpkeymanager.web.dto.GroupSummaryResponse;
import org.bruneel.pgpkeymanager.web.dto.UpdateGroupRequest;

@RestController
@RequestMapping(path = "/api/groups", produces = MediaType.APPLICATION_JSON_VALUE)
public class GroupController {

    private final CurrentUserService currentUserService;
    private final GroupService groupService;

    public GroupController(CurrentUserService currentUserService, GroupService groupService) {
        this.currentUserService = currentUserService;
        this.groupService = groupService;
    }

    @GetMapping
    public List<GroupResponse> list(Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return groupService.listGroups(user).stream().map(GroupResponse::from).toList();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@Valid @RequestBody CreateGroupRequest request, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return GroupResponse.from(groupService.createGroup(user, request.name(), request.description()));
    }

    @GetMapping("/{groupId}")
    public GroupResponse get(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return GroupResponse.from(groupService.getGroup(user, groupId));
    }

    @PatchMapping(path = "/{groupId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public GroupResponse update(
            @PathVariable UUID groupId,
            @Valid @RequestBody UpdateGroupRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return GroupResponse.from(groupService.updateGroup(user, groupId, request.name(), request.description()));
    }

    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        groupService.deleteGroup(user, groupId);
    }

    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> listMembers(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return groupService.listMembers(user, groupId).stream().map(GroupMemberResponse::from).toList();
    }

    @DeleteMapping("/{groupId}/members/{memberUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @PathVariable UUID groupId, @PathVariable UUID memberUserId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        groupService.removeMember(user, groupId, memberUserId);
    }

    @PostMapping(path = "/{groupId}/invites", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GroupInviteResponse invite(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateGroupInviteRequest request,
            Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        GroupMembershipRole role = request.role() == null ? null : GroupMembershipRole.fromDb(request.role());
        return GroupInviteResponse.from(
                groupService.invite(user, groupId, request.email(), request.inviteeUserId(), role, request.expiresAt()));
    }

    @GetMapping("/{groupId}/invites")
    public List<GroupInviteResponse> listInvites(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return groupService.listInvites(user, groupId).stream().map(GroupInviteResponse::from).toList();
    }

    @GetMapping("/{groupId}/summary")
    public GroupSummaryResponse summary(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        return GroupSummaryResponse.from(groupService.getSummary(user, groupId));
    }

    @GetMapping(path = "/{groupId}/members/audit.csv", produces = "text/csv")
    public ResponseEntity<String> membersAudit(@PathVariable UUID groupId, Authentication authentication) {
        AppUser user = currentUserService.requireCurrentUser(authentication);
        String csv = groupService.exportMembersAuditCsv(user, groupId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv")).body(csv);
    }
}
