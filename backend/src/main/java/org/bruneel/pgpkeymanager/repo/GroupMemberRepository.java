package org.bruneel.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.GroupMember;
import org.bruneel.pgpkeymanager.domain.GroupMembershipRole;

@Repository
public class GroupMemberRepository {

    private final JdbcClient jdbc;

    public GroupMemberRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public GroupMember insert(UUID groupId, UUID userId, GroupMembershipRole role, UUID invitedByUserId) {
        jdbc.sql(
                        """
                        INSERT INTO group_members (group_id, user_id, role, invited_by_user_id)
                        VALUES (:groupId, :userId, :role, :invitedByUserId)
                        """)
                .param("groupId", groupId)
                .param("userId", userId)
                .param("role", role.toDb())
                .param("invitedByUserId", invitedByUserId)
                .update();
        return findByGroupIdAndUserId(groupId, userId).orElseThrow();
    }

    public GroupMember upsert(UUID groupId, UUID userId, GroupMembershipRole role, UUID invitedByUserId) {
        try {
            return insert(groupId, userId, role, invitedByUserId);
        } catch (DataIntegrityViolationException ex) {
            jdbc.sql(
                            """
                            UPDATE group_members
                            SET role = :role,
                                invited_by_user_id = COALESCE(:invitedByUserId, invited_by_user_id)
                            WHERE group_id = :groupId
                              AND user_id = :userId
                            """)
                    .param("groupId", groupId)
                    .param("userId", userId)
                    .param("role", role.toDb())
                    .param("invitedByUserId", invitedByUserId)
                    .update();
            return findByGroupIdAndUserId(groupId, userId).orElseThrow();
        }
    }

    public Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId) {
        return jdbc.sql(
                        """
                        SELECT group_id, user_id, role, invited_by_user_id, joined_at
                        FROM group_members
                        WHERE group_id = :groupId
                          AND user_id = :userId
                        """)
                .param("groupId", groupId)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public boolean existsByGroupIdAndUserId(UUID groupId, UUID userId) {
        Integer count =
                jdbc.sql(
                                """
                                SELECT COUNT(*) FROM group_members
                                WHERE group_id = :groupId
                                  AND user_id = :userId
                                """)
                        .param("groupId", groupId)
                        .param("userId", userId)
                        .query(Integer.class)
                        .single();
        return count != null && count > 0;
    }

    public List<GroupMember> findAllByGroupId(UUID groupId) {
        return jdbc.sql(
                        """
                        SELECT group_id, user_id, role, invited_by_user_id, joined_at
                        FROM group_members
                        WHERE group_id = :groupId
                        ORDER BY joined_at ASC
                        """)
                .param("groupId", groupId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public int countByGroupId(UUID groupId) {
        Integer count =
                jdbc.sql("SELECT COUNT(*) FROM group_members WHERE group_id = :groupId")
                        .param("groupId", groupId)
                        .query(Integer.class)
                        .single();
        return count == null ? 0 : count;
    }

    public int countOwnersByGroupId(UUID groupId) {
        Integer count =
                jdbc.sql(
                                """
                                SELECT COUNT(*) FROM group_members
                                WHERE group_id = :groupId
                                  AND role = 'owner'
                                """)
                        .param("groupId", groupId)
                        .query(Integer.class)
                        .single();
        return count == null ? 0 : count;
    }

    public boolean deleteByGroupIdAndUserId(UUID groupId, UUID userId) {
        return jdbc.sql("DELETE FROM group_members WHERE group_id = :groupId AND user_id = :userId")
                        .param("groupId", groupId)
                        .param("userId", userId)
                        .update()
                > 0;
    }

    public List<GroupMemberAuditRow> findAuditRowsByGroupId(UUID groupId) {
        return jdbc.sql(
                        """
                        SELECT gm.group_id, gm.user_id, gm.role, gm.invited_by_user_id, gm.joined_at,
                               au.email, au.display_name, au.auth0_sub
                        FROM group_members gm
                        JOIN app_users au ON au.id = gm.user_id
                        WHERE gm.group_id = :groupId
                        ORDER BY gm.joined_at ASC
                        """)
                .param("groupId", groupId)
                .query((rs, rowNum) -> mapAuditRow(rs))
                .list();
    }

    public record GroupMemberAuditRow(
            UUID groupId,
            UUID userId,
            GroupMembershipRole role,
            UUID invitedByUserId,
            java.time.Instant joinedAt,
            String email,
            String displayName,
            String auth0Sub) {}

    private static GroupMember mapRow(ResultSet rs) throws SQLException {
        return new GroupMember(
                rs.getObject("group_id", UUID.class),
                rs.getObject("user_id", UUID.class),
                GroupMembershipRole.fromDb(rs.getString("role")),
                rs.getObject("invited_by_user_id", UUID.class),
                rs.getTimestamp("joined_at").toInstant());
    }

    private static GroupMemberAuditRow mapAuditRow(ResultSet rs) throws SQLException {
        return new GroupMemberAuditRow(
                rs.getObject("group_id", UUID.class),
                rs.getObject("user_id", UUID.class),
                GroupMembershipRole.fromDb(rs.getString("role")),
                rs.getObject("invited_by_user_id", UUID.class),
                rs.getTimestamp("joined_at").toInstant(),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("auth0_sub"));
    }
}
