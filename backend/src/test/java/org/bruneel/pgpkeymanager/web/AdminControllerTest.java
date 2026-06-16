package org.bruneel.pgpkeymanager.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.bruneel.pgpkeymanager.domain.AppUser;
import org.bruneel.pgpkeymanager.domain.Group;
import org.bruneel.pgpkeymanager.repo.AppUserRepository;
import org.bruneel.pgpkeymanager.repo.GroupMemberRepository;
import org.bruneel.pgpkeymanager.repo.GroupRepository;
import org.bruneel.pgpkeymanager.repo.PgpKeyRepository;
import org.bruneel.pgpkeymanager.service.CurrentUserService;
import org.bruneel.pgpkeymanager.service.PlatformAdminService;

@WebMvcTest(controllers = AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private PlatformAdminService platformAdminService;

    @MockitoBean
    private GroupRepository groupRepository;

    @MockitoBean
    private GroupMemberRepository groupMemberRepository;

    @MockitoBean
    private PgpKeyRepository pgpKeyRepository;

    @MockitoBean
    private AppUserRepository appUserRepository;

    @Test
    void listGroupsReturnsAdminView() throws Exception {
        AppUser admin = new AppUser(UUID.randomUUID(), "auth0|admin", "admin@example.test", "Admin", "admin", Instant.now());
        Group group = new Group(UUID.randomUUID(), "Team", null, admin.id(), Instant.now(), Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(admin);
        when(groupRepository.findAll()).thenReturn(List.of(group));
        when(groupMemberRepository.countByGroupId(group.id())).thenReturn(2);
        when(pgpKeyRepository.countByOwnerGroupId(group.id())).thenReturn(5);

        mockMvc.perform(get("/api/admin/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(group.id().toString()))
                .andExpect(jsonPath("$[0].memberCount").value(2))
                .andExpect(jsonPath("$[0].keyCount").value(5));

        verify(platformAdminService).requirePlatformAdmin(admin);
    }

    @Test
    void listUsersReturnsAdminView() throws Exception {
        AppUser admin = new AppUser(UUID.randomUUID(), "auth0|admin", "admin@example.test", "Admin", "admin", Instant.now());
        AppUser user = new AppUser(UUID.randomUUID(), "auth0|user", "user@example.test", "User", "user", Instant.now());
        when(currentUserService.requireCurrentUser(any())).thenReturn(admin);
        when(appUserRepository.findAll()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(user.id().toString()))
                .andExpect(jsonPath("$[0].platformRole").value("user"));

        verify(platformAdminService).requirePlatformAdmin(admin);
    }
}
