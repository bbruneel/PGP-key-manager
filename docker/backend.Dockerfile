# syntax=docker/dockerfile:1

FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn ./.mvn
RUN chmod +x mvnw

COPY backend/src ./src
RUN ./mvnw -DskipTests package -B

FROM eclipse-temurin:25-jre AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/target/pgp-key-manager-api-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
