package org.bruneel.pgpkeymanager.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.Group;

@Repository
public class GroupRepository {

    private final JdbcClient jdbc;

    public GroupRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Group insert(String name, String description, UUID ownerUserId) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO groups (id, name, description, owner_user_id)
                        VALUES (:id, :name, :description, :ownerUserId)
                        """)
                .param("id", id)
                .param("name", name)
                .param("description", description)
                .param("ownerUserId", ownerUserId)
                .update();
        return findById(id).orElseThrow();
    }

    public Optional<Group> findById(UUID groupId) {
        return jdbc.sql(
                        """
                        SELECT id, name, description, owner_user_id, created_at, updated_at
                        FROM groups
                        WHERE id = :groupId
                        """)
                .param("groupId", groupId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public List<Group> findAllByMemberUserId(UUID userId) {
        return jdbc.sql(
                        """
                        SELECT g.id, g.name, g.description, g.owner_user_id, g.created_at, g.updated_at
                        FROM groups g
                        JOIN group_members gm ON gm.group_id = g.id
                        WHERE gm.user_id = :userId
                        ORDER BY g.created_at DESC
                        """)
                .param("userId", userId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public List<Group> findAll() {
        return jdbc.sql(
                        """
                        SELECT id, name, description, owner_user_id, created_at, updated_at
                        FROM groups
                        ORDER BY created_at DESC
                        """)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<Group> update(UUID groupId, String name, String description) {
        int rows =
                jdbc.sql(
                                """
                                UPDATE groups
                                SET name = COALESCE(:name, name),
                                    description = COALESCE(:description, description),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = :groupId
                                """)
                        .param("groupId", groupId)
                        .param("name", name)
                        .param("description", description)
                        .update();
        if (rows == 0) {
            return Optional.empty();
        }
        return findById(groupId);
    }

    public boolean deleteById(UUID groupId) {
        return jdbc.sql("DELETE FROM groups WHERE id = :groupId")
                        .param("groupId", groupId)
                        .update()
                > 0;
    }

    private static Group mapRow(ResultSet rs) throws SQLException {
        return new Group(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("description"),
                rs.getObject("owner_user_id", UUID.class),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
