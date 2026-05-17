package com.example.pgpkeymanager.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.example.pgpkeymanager.domain.AppUser;

@Repository
public class AppUserRepository {

    private final JdbcClient jdbc;

    public AppUserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public AppUser upsertByAuth0Sub(String auth0Sub) {
        return findByAuth0Sub(auth0Sub).orElseGet(() -> insert(auth0Sub));
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

    public Optional<AppUser> findByAuth0Sub(String auth0Sub) {
        return jdbc.sql(
                        """
                        SELECT id, auth0_sub, created_at
                        FROM app_users
                        WHERE auth0_sub = :auth0Sub
                        """)
                .param("auth0Sub", auth0Sub)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    private static AppUser mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AppUser(
                rs.getObject("id", UUID.class),
                rs.getString("auth0_sub"),
                rs.getTimestamp("created_at").toInstant());
    }
}
