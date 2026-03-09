# Stage 1: Build Frontend
FROM node:20 AS frontend-build
WORKDIR /app/Frontend

# Copy frontend source and install dependencies
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ ./

# Build the Vite application (this will output to /app/Taskboard/wwwroot as per vite.config.js)
RUN npm run build

# Stage 2: Build Backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /source

# Copy csproj and restore
COPY Taskboard/*.csproj ./Taskboard/
WORKDIR /source/Taskboard
RUN dotnet restore

# Copy backend source
WORKDIR /source
COPY Taskboard/ ./Taskboard/

# Copy the built frontend from Stage 1 into the backend's wwwroot
# (Vite is configured to output to ../Taskboard/wwwroot, but doing it explicitly guarantees it reaches the publish folder)
COPY --from=frontend-build /app/Taskboard/wwwroot ./Taskboard/wwwroot/

# Publish
WORKDIR /source/Taskboard
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Expose ports that Render uses by default
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=backend-build /app/publish .

# Install tzdata just in case TimeZone logic is used
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["dotnet", "Taskboard.dll"]
