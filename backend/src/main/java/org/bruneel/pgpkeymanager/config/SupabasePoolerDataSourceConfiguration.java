package org.bruneel.pgpkeymanager.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SupabasePoolerDataSourceConfiguration {

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

    static boolean usesPgBouncerTransactionPooler(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return false;
        }
        String lower = jdbcUrl.toLowerCase();
        return lower.contains("pgbouncer=true") || lower.contains(":6543/") || lower.contains("pooler.");
    }
}
