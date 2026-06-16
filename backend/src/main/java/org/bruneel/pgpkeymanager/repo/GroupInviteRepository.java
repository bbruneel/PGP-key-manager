package org.bruneel.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.GroupInvite;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;

@Repository
public class GroupInviteRepository {

    private final JdbcClient jdbc;

    public GroupInviteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public GroupInvite insert(
            UUID groupId,
            String token,
            String email,
            UUID inviteeUserId,
            GroupMembershipRole role,
            UUID invitedByUserId,
            Instant expiresAt) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO group_invites (
                            id, group_id, token, email, invitee_user_id, role, invited_by_user_id, expires_at
                        )
                        VALUES (
                            :id, :groupId, :token, :email, :inviteeUserId, :role, :invitedByUserId, :expiresAt
                        )
                        """)
                .param("id", id)
                .param("groupId", groupId)
                .param("token", token)
                .param("email", email)
                .param("inviteeUserId", inviteeUserId)
                .param("role", role.toDb())
                .param("invitedByUserId", invitedByUserId)
                .param("expiresAt", Timestamp.from(expiresAt))
                .update();
        return findById(id).orElseThrow();
    }

    public Optional<GroupInvite> findById(UUID inviteId) {
        return jdbc.sql(
                        """
                        SELECT id, group_id, token, email, invitee_user_id, role, invited_by_user_id, expires_at, accepted_at, created_at
                        FROM group_invites
                        WHERE id = :inviteId
                        """)
                .param("inviteId", inviteId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public Optional<GroupInvite> findByToken(String token) {
        return jdbc.sql(
                        """
                        SELECT id, group_id, token, email, invitee_user_id, role, invited_by_user_id, expires_at, accepted_at, created_at
                        FROM group_invites
                        WHERE token = :token
                        """)
                .param("token", token)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public List<GroupInvite> findPendingByGroupId(UUID groupId) {
        return jdbc.sql(
                        """
                        SELECT id, group_id, token, email, invitee_user_id, role, invited_by_user_id, expires_at, accepted_at, created_at
                        FROM group_invites
                        WHERE group_id = :groupId
                          AND accepted_at IS NULL
                        ORDER BY created_at DESC
                        """)
                .param("groupId", groupId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public int countPendingByGroupId(UUID groupId) {
        Integer count =
                jdbc.sql(
                                """
                                SELECT COUNT(*) FROM group_invites
                                WHERE group_id = :groupId
                                  AND accepted_at IS NULL
                                """)
                        .param("groupId", groupId)
                        .query(Integer.class)
                        .single();
        return count == null ? 0 : count;
    }

    public Optional<GroupInvite> markAccepted(UUID inviteId, Instant acceptedAt) {
        int rows =
                jdbc.sql(
                                """
                                UPDATE group_invites
                                SET accepted_at = :acceptedAt
                                WHERE id = :inviteId
                                  AND accepted_at IS NULL
                                """)
                        .param("inviteId", inviteId)
                        .param("acceptedAt", Timestamp.from(acceptedAt))
                        .update();
        if (rows == 0) {
            return Optional.empty();
        }
        return findById(inviteId);
    }

    public boolean deletePendingById(UUID inviteId) {
        return jdbc.sql(
                        """
                        DELETE FROM group_invites
                        WHERE id = :inviteId
                          AND accepted_at IS NULL
                        """)
                .param("inviteId", inviteId)
                .update()
                > 0;
    }

    private static GroupInvite mapRow(ResultSet rs) throws SQLException {
        Timestamp acceptedAt = rs.getTimestamp("accepted_at");
        return new GroupInvite(
                rs.getObject("id", UUID.class),
                rs.getObject("group_id", UUID.class),
                rs.getString("token"),
                rs.getString("email"),
                rs.getObject("invitee_user_id", UUID.class),
                GroupMembershipRole.fromDb(rs.getString("role")),
                rs.getObject("invited_by_user_id", UUID.class),
                rs.getTimestamp("expires_at").toInstant(),
                acceptedAt == null ? null : acceptedAt.toInstant(),
                rs.getTimestamp("created_at").toInstant());
    }
}
