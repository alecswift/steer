defmodule Steer.Telemetry do
  @moduledoc """
  Backend telemetry: OpenTelemetry setup, trace IDs on logs, and product events.

  Names follow the "Telemetry conventions" in PLAN.md: events are lowercase
  `area.action` with `snake_case` attributes. Route coordinates never go into
  telemetry; send IDs and stats instead.
  """

  require Logger

  @doc """
  Starts tracing and log correlation. Call it before the supervision tree starts.
  """
  def setup do
    # Traces: Bandit and Phoenix spans for each request (continuing the
    # browser's trace from its traceparent header), with Ecto query spans
    # inside them.
    OpentelemetryBandit.setup()
    OpentelemetryPhoenix.setup(adapter: :bandit)
    OpentelemetryEcto.setup([:steer, :repo])

    # Metrics: request, query and VM metrics, exported to Prometheus.
    Steer.Telemetry.Metrics.setup()

    # Every log made inside a span carries its trace and span IDs, for both
    # the console and the OTLP handler.
    :logger.add_primary_filter(:otel_trace_ids, {&__MODULE__.add_trace_ids/2, []})

    # Handlers configured under `config :steer, :logger`, such as the OTLP
    # handler that sends logs to Loki in dev.
    Logger.add_handlers(:steer)
  end

  @doc """
  Records a product event: an info log whose message and `event.name` are the
  event name, with `attrs` as attributes. It has the same shape as the
  frontend's `track`, so both land in Loki the same way.

      Steer.Telemetry.event("route.saved", route_id: route.id, leg_count: 3)
  """
  def event(name, attrs \\ []) when is_binary(name) do
    Logger.info(name, Keyword.put(attrs, :"event.name", name))
  end

  @doc false
  # A `:logger` primary filter; it runs in the process that logs, where the
  # current span is.
  def add_trace_ids(%{meta: meta} = log_event, _config) do
    case OpenTelemetry.Tracer.current_span_ctx() do
      :undefined -> log_event
      span_ctx -> %{log_event | meta: Map.merge(meta, :otel_span.hex_span_ctx(span_ctx))}
    end
  end

  @doc false
  # A filter on the OTLP log handler. The handler sends all metadata as
  # attributes, so this drops what isn't useful and turns the file charlist
  # and the MFA tuple into strings. The otel_* IDs must stay: the handler
  # reads them to set each record's trace_id and span_id.
  def otlp_log_attributes(%{meta: meta} = log_event, _config) do
    meta =
      meta
      |> Map.drop([:pid, :domain])
      |> Map.replace_lazy(:file, &to_string/1)
      |> Map.replace_lazy(:mfa, fn {m, f, a} -> Exception.format_mfa(m, f, a) end)

    %{log_event | meta: meta}
  end
end
