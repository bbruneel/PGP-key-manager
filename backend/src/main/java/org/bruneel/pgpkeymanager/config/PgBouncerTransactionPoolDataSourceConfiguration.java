package org.bruneel.pgpkeymanager.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Disables JDBC server-side prepared statements when the app datasource targets a
 * <strong>PgBouncer transaction pool</strong> (not Supabase specifically).
 *
 * <p>In transaction pooling mode, PgBouncer can assign a different Postgres backend
 * session for each transaction. The PostgreSQL JDBC driver keeps prepared statement
 * names (S_1, S_2, …) on the client connection, which then collide across backend
 * sessions and produce errors such as {@code prepared statement "S_1" already exists}.
 *
 * <p>Setting {@code prepareThreshold=0} tells the driver to use simple queries instead.
 * This is required for transaction poolers; direct Postgres connections ({@code :5432})
 * do not need it and are left unchanged by this configuration.
 *
 * <p>Detection is based on JDBC URL signals common to transaction poolers (e.g. Supabase
 * port 6543): {@code pgbouncer=true}, {@code :6543/}, or a host containing {@code pooler.}.
 */
@Configuration
public class PgBouncerTransactionPoolDataSourceConfiguration {

    @Bean
    static BeanPostProcessor postgresPoolerPrepareThresholdConfigurer(
            @Value("${spring.datasource.url:}") String jdbcUrl) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof HikariDataSource hikari && usesPgBouncerTransactionPooler(jdbcUrl)) {
                    hikari.addDataSourceProperty("prepareThreshold", "0");
                }
                return bean;
            }
        };
    }

    /**
     * Heuristic for PgBouncer <em>transaction</em> pool JDBC URLs. Not limited to Supabase;
     * any provider using these URL patterns benefits from the same fix.
     */
    static boolean usesPgBouncerTransactionPooler(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return false;
        }
        String lower = jdbcUrl.toLowerCase();
        return lower.contains("pgbouncer=true") || lower.contains(":6543/") || lower.contains("pooler.");
    }
}
