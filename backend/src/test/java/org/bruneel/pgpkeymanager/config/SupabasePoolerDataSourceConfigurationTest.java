package org.bruneel.pgpkeymanager.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SupabasePoolerDataSourceConfigurationTest {

    @Test
    void detectsSupabaseTransactionPoolerUrls() {
        assertThat(SupabasePoolerDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"))
                .isTrue();
        assertThat(SupabasePoolerDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://example.pooler.supabase.com:6543/postgres"))
                .isTrue();
    }

    @Test
    void ignoresDirectAndLocalUrls() {
        assertThat(SupabasePoolerDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://db.example.supabase.co:5432/postgres"))
                .isFalse();
        assertThat(SupabasePoolerDataSourceConfiguration.usesPgBouncerTransactionPooler(
                        "jdbc:postgresql://localhost:5432/postgres"))
                .isFalse();
        assertThat(SupabasePoolerDataSourceConfiguration.usesPgBouncerTransactionPooler(""))
                .isFalse();
    }
}
