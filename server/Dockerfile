# Dev image for Phoenix in Docker Compose. Compose bind-mounts the source,
# so the image only provides the toolchain (matches .tool-versions).
FROM elixir:1.20.4-otp-29

RUN mix local.hex --force && mix local.rebar --force

WORKDIR /app
