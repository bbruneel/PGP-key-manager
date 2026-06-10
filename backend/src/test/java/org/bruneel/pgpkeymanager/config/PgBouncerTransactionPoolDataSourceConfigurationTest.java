package org.bruneel.pgpkeymanager.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

class PgBouncerTransactionPoolDataSourceConfigurationTest {

    @Test
    void detectsPgBouncerTransactionPoolerUrls() {
        assertThat(PgBouncerTransactionPoolDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"))
                .isTrue();
        assertThat(PgBouncerTransactionPoolDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://example.pooler.example.com:6543/postgres"))
                .isTrue();
    }

    @Test
    void ignoresDirectAndLocalUrls() {
        assertThat(PgBouncerTransactionPoolDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://db.example.supabase.co:5432/postgres"))
                .isFalse();
        assertThat(PgBouncerTransactionPoolDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://localhost:5432/postgres"))
                .isFalse();
        assertThat(PgBouncerTransactionPoolDataSourceConfiguration.usesPgBouncerTransactionPooler(""))
                .isFalse();
    }

    @Test
    void setsPrepareThresholdOnHikariDataSourceForPoolerUrl() {
        new ApplicationContextRunner()
                .withUserConfiguration(PoolerBackedDataSourceConfiguration.class)
                .withPropertyValues(
                        "spring.datasource.url=jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true")
                .run(context -> {
                    HikariDataSource dataSource = context.getBean(HikariDataSource.class);
                    assertThat(dataSource.getDataSourceProperties()).containsEntry("prepareThreshold", "0");
                });
    }

    @Test
    void leavesHikariDataSourceUnchangedForDirectPostgresUrl() {
        new ApplicationContextRunner()
                .withUserConfiguration(PoolerBackedDataSourceConfiguration.class)
                .withPropertyValues("spring.datasource.url=jdbc:postgresql://db.example.supabase.co:5432/postgres")
                .run(context -> {
                    HikariDataSource dataSource = context.getBean(HikariDataSource.class);
                    assertThat(dataSource.getDataSourceProperties()).doesNotContainKey("prepareThreshold");
                });
    }

    @Configuration
    @Import(PgBouncerTransactionPoolDataSourceConfiguration.class)
    static class PoolerBackedDataSourceConfiguration {

        @Bean
        HikariDataSource dataSource() {
            HikariDataSource dataSource = new HikariDataSource();
            dataSource.setJdbcUrl("jdbc:postgresql://localhost:5432/postgres");
            dataSource.setUsername("postgres");
            dataSource.setPassword("postgres");
            return dataSource;
        }
    }
}
