package org.bruneel.pgpkeymanager.storage;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AwsStorageProperties.class)
public class AwsStorageConfiguration {}
