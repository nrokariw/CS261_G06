ARG DB_PLATFORM=linux/amd64
ARG DB_IMAGE=mcr.microsoft.com/mssql/server:2022-latest

# MSSQL 2022 only provides a linux/amd64 manifest; explicit platform allows Rosetta/QEMU emulation on ARM64 macOS
FROM --platform=${DB_PLATFORM} ${DB_IMAGE}

ENV ACCEPT_EULA=Y

EXPOSE 1433
