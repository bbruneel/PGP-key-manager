package org.bruneel.pgpkeymanager.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.Group;
import org.bruneel.pgpkeymanager.domain.GroupInvite;
import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.GroupService;
import org.bruneel.pgpkeymanager.service.GroupService.GroupSummary;

@WebMvcTest(controllers = GroupController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class GroupControllerTest {

    private static final AppUser USER =
            new AppUser(
                    UUID.fromString("00000000-0000-0000-0000-000000000001"),
                    "auth0|test",
                    "test@example.test",
                    "Test User",
                    "user",
                    Instant.EPOCH);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private GroupService groupService;

    @Test
    void listReturnsGroups() throws Exception {
        Group group = group();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.listGroups(USER)).thenReturn(List.of(group));

        mockMvc.perform(get("/api/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(group.id().toString()));

        verify(groupService).listGroups(USER);
    }

    @Test
    void createReturnsCreated() throws Exception {
        Group group = group();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.createGroup(USER, "Team", "Vault")).thenReturn(group);

        mockMvc.perform(post("/api/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Team\",\"description\":\"Vault\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Team"));

        verify(groupService).createGroup(USER, "Team", "Vault");
    }

    @Test
    void getReturnsGroup() throws Exception {
        Group group = group();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.getGroup(USER, group.id())).thenReturn(group);

        mockMvc.perform(get("/api/groups/{groupId}", group.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(group.id().toString()));
    }

    @Test
    void updateReturnsGroup() throws Exception {
        Group group = new Group(group().id(), "Updated", "Vault", USER.id(), Instant.now(), Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.updateGroup(eq(USER), eq(group.id()), eq("Updated"), eq("Vault"))).thenReturn(group);

        mockMvc.perform(patch("/api/groups/{groupId}", group.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated\",\"description\":\"Vault\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        UUID groupId = group().id();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);

        mockMvc.perform(delete("/api/groups/{groupId}", groupId)).andExpect(status().isNoContent());

        verify(groupService).deleteGroup(USER, groupId);
    }

    @Test
    void listMembersReturnsMembers() throws Exception {
        UUID groupId = group().id();
        GroupMember member = new GroupMember(groupId, USER.id(), GroupMembershipRole.OWNER, USER.id(), Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.listMembers(USER, groupId)).thenReturn(List.of(member));

        mockMvc.perform(get("/api/groups/{groupId}/members", groupId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("owner"));
    }

    @Test
    void removeMemberReturnsNoContent() throws Exception {
        UUID groupId = group().id();
        UUID memberId = UUID.randomUUID();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);

        mockMvc.perform(delete("/api/groups/{groupId}/members/{memberUserId}", groupId, memberId))
                .andExpect(status().isNoContent());

        verify(groupService).removeMember(USER, groupId, memberId);
    }

    @Test
    void inviteReturnsCreated() throws Exception {
        UUID groupId = group().id();
        GroupInvite invite =
                new GroupInvite(
                        UUID.randomUUID(),
                        groupId,
                        "token",
                        "invitee@example.test",
                        null,
                        GroupMembershipRole.MEMBER,
                        USER.id(),
                        Instant.now().plusSeconds(3600),
                        null,
                        Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.invite(eq(USER), eq(groupId), eq("invitee@example.test"), eq(null), eq(GroupMembershipRole.MEMBER), any()))
                .thenReturn(invite);

        mockMvc.perform(post("/api/groups/{groupId}/invites", groupId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invitee@example.test\",\"role\":\"member\",\"expiresAt\":\"2030-01-01T00:00:00Z\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("token"));
    }

    @Test
    void listInvitesReturnsPendingInvites() throws Exception {
        UUID groupId = group().id();
        GroupInvite invite =
                new GroupInvite(
                        UUID.randomUUID(),
                        groupId,
                        "token",
                        "invitee@example.test",
                        null,
                        GroupMembershipRole.MEMBER,
                        USER.id(),
                        Instant.now().plusSeconds(3600),
                        null,
                        Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.listInvites(USER, groupId)).thenReturn(List.of(invite));

        mockMvc.perform(get("/api/groups/{groupId}/invites", groupId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].token").value("token"));
    }

    @Test
    void summaryReturnsCounts() throws Exception {
        Group group = group();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.getSummary(USER, group.id())).thenReturn(new GroupSummary(group, 2, 1, 3));

        mockMvc.perform(get("/api/groups/{groupId}/summary", group.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(2))
                .andExpect(jsonPath("$.keyCount").value(3));
    }

    @Test
    void membersAuditReturnsCsv() throws Exception {
        UUID groupId = group().id();
        when(currentUserService.requireCurrentUser(any())).thenReturn(USER);
        when(groupService.exportMembersAuditCsv(USER, groupId)).thenReturn("groupId,userId\n\"g\",\"u\"\n");

        mockMvc.perform(get("/api/groups/{groupId}/members/audit.csv", groupId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("groupId,userId")));
    }

    private static Group group() {
        UUID groupId = UUID.fromString("00000000-0000-0000-0000-000000000010");
        return new Group(groupId, "Team", "Vault", USER.id(), Instant.EPOCH, Instant.EPOCH);
    }
}
