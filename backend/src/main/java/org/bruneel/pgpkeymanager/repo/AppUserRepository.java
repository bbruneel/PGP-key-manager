package org.bruneel.pgpkeymanager.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import org.bruneel.pgpkeymanager.domain.AppUser;

@Repository
public class AppUserRepository {

    private final JdbcClient jdbc;

    public AppUserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public AppUser upsertByAuth0Sub(String auth0Sub) {
        return findByAuth0Sub(auth0Sub).orElseGet(() -> insertIgnoringDuplicate(auth0Sub));
    }

    private AppUser insertIgnoringDuplicate(String auth0Sub) {
        try {
            return insert(auth0Sub);
        } catch (DataIntegrityViolationException ex) {
            return findByAuth0Sub(auth0Sub).orElseThrow(() -> ex);
        }
    }

    private AppUser insert(String auth0Sub) {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                        """
                        INSERT INTO app_users (id, auth0_sub)
                        VALUES (:id, :auth0Sub)
                        """)
                .param("id", id)
                .param("auth0Sub", auth0Sub)
                .update();
        return findByAuth0Sub(auth0Sub).orElseThrow();
    }

    public Optional<AppUser> findById(UUID id) {
        return jdbc.sql(
                        """
                        SELECT id, auth0_sub, email, display_name, platform_role, created_at
                        FROM app_users
                        WHERE id = :id
                        """)
                .param("id", id)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public java.util.List<AppUser> findAll() {
        return jdbc.sql(
                        """
                        SELECT id, auth0_sub, email, display_name, platform_role, created_at
                        FROM app_users
                        ORDER BY created_at DESC
                        """)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<AppUser> findByAuth0Sub(String auth0Sub) {
        return jdbc.sql(
                        """
                        SELECT id, auth0_sub, email, display_name, platform_role, created_at
                        FROM app_users
                        WHERE auth0_sub = :auth0Sub
                        """)
                .param("auth0Sub", auth0Sub)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public AppUser updateProfile(UUID userId, String email, String displayName) {
        jdbc.sql(
                        """
                        UPDATE app_users
                        SET email = :email,
                            display_name = :displayName
                        WHERE id = :id
                        """)
                .param("id", userId)
                .param("email", emptyToNull(email))
                .param("displayName", emptyToNull(displayName))
                .update();
        return findById(userId).orElseThrow();
    }

    private static String emptyToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static AppUser mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AppUser(
                rs.getObject("id", UUID.class),
                rs.getString("auth0_sub"),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("platform_role"),
                rs.getTimestamp("created_at").toInstant());
    }
}
