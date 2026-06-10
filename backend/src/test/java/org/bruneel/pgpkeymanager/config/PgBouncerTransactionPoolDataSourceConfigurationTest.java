package org.bruneel.pgpkeymanager.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

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
}
