package com.example.pgpkeymanager.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.example.pgpkeymanager.TestJwtConfiguration;
import com.example.pgpkeymanager.config.RequestIdFilter;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestJwtConfiguration.class)
class HelloControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void helloPropagatesRequestId() throws Exception {
        MvcResult result = mockMvc.perform(
                        get("/api/hello")
                                .accept(MediaType.APPLICATION_JSON)
                                .header(RequestIdFilter.HEADER, "fixed-test-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("ok"))
                .andExpect(header().string(RequestIdFilter.HEADER, "fixed-test-id"))
                .andReturn();

        assertThat(result.getResponse().getHeader(RequestIdFilter.HEADER)).isEqualTo("fixed-test-id");
    }
}
