FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Source project is nested inside the demo subdirectory
COPY demo/mvnw ./
COPY demo/.mvn .mvn
COPY demo/pom.xml ./

RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY demo/src src
RUN ./mvnw package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# pom.xml uses war packaging; Spring Boot Maven plugin produces an executable WAR
COPY --from=build /app/target/*.war app.war

# สร้างโฟลเดอร์ uploads/images รอไว้ใน Container
RUN mkdir -p uploads/products

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.war"]
