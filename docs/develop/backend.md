# Backend

Spring Boot **4.1.x**, Java **25**, package root `org.bruneel.pgpkeymanager` (controllers historically under `com.example.pgpkeymanager.web` paths mapped at `/api`).

## Conventions

- **Request ID:** `RequestIdFilter` reads or generates `X-Request-Id`, stores it in MDC (`requestId`), echoes on the response.
- **CORS:** `CORS_ALLOWED_ORIGINS` (comma-separated); default `http://localhost:5173`.
- **Logging:** default readable pattern with `%X{requestId}`; `prod` profile uses JSON (`logstash-logback-encoder`).
- **Secrets:** never commit `application-secret.yaml`; use the `.example` file or environment variables.
- **Passphrases:** REST DTOs deserialize into wipeable `char[]` (`@JsonPassphrase`); cleared after crypto (`PassphraseUtil`).
- **Crypto:** Bouncy Castle OpenPGP; armored keyrings on the **primary** row only.

## Dependency pins (security)

Spring Boot **4.1.0** parent BOM; Flyway **12.11.0** override; CVE-monitored postgresql/logback versions documented in `backend/pom.xml`. Startup logs `build_dependencies_audit`. Regression guards: `ResolvedDependencyVersionsTest`.

Spring Boot 4.1 uses Jackson 3 (`tools.jackson` packages; `com.fasterxml.jackson.annotation` unchanged).

## Tests

Prefer TDD. Use `@WebMvcTest` for controller slices and `@SpringBootTest` + `MockMvc` for integration.

**Every REST handler** needs a focused slice test in the matching `*ControllerTest` (mock service → MockMvc → status/fields → `verify`). See the endpoint checklists in repository [`AGENTS.md`](https://github.com/bbruneel/PGP-key-manager/blob/main/AGENTS.md).

```bash
cd backend
./mvnw test
./mvnw spring-boot:run
```

## See also

- [Local setup](./local-setup)
- [Architecture](./architecture)
- [Contributing](./contributing)
- [OpenAPI](/api/)
