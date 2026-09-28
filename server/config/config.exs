# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :steer,
  ecto_repos: [Steer.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

# PostGIS geometry types (see lib/steer/postgres_types.ex).
config :steer, Steer.Repo, types: Steer.PostgresTypes

# Configure the endpoint
config :steer, SteerWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: SteerWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Steer.PubSub,
  live_view: [signing_salt: "cn7hqNRP"]

# OpenTelemetry resource, on every trace, log and metric Phoenix sends.
config :opentelemetry,
  resource: [
    service: [name: "steer-backend", version: Mix.Project.config()[:version]],
    deployment: [environment: to_string(config_env())]
  ]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
