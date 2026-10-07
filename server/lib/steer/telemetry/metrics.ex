defmodule Steer.Telemetry.Metrics do
  @moduledoc """
  Backend metrics, recorded with the OpenTelemetry metrics SDK and exported
  over OTLP to Prometheus (see the `readers` config in `config/dev.exs`).

  Names follow the conventions in PLAN.md: a `steer.` prefix and the unit in
  the name. No `unit` option is set, so Prometheus keeps the name as written
  (e.g. `steer_http_request_duration_ms_bucket`).

    * `steer.http.request.duration_ms`: each routed request, by `http.route`,
      `http.request.method` and `http.response.status_code`. Its count is the
      request rate.
    * `steer.db.query.duration_ms`: each Ecto query's total time, by `source`
      (the table, when the query has one).
    * `steer.vm.memory_bytes`: BEAM memory, by `kind` (`total`, `processes`,
      `binary`, `ets`, `atom`, `code`).
    * `steer.dem.tile_cache`: DEM tile lookups, by `result` (`hit` / `miss`).

  Prometheus rejects a whole OTLP push when any metric in it has no data
  points, and the SDK exports instruments that haven't recorded anything yet.
  So histograms and counters are created on their first recording, not up
  front.
  """

  require OpenTelemetryAPIExperimental.Counter, as: Counter
  require OpenTelemetryAPIExperimental.Histogram, as: Histogram
  require OpenTelemetryAPIExperimental.ObservableGauge, as: ObservableGauge

  # Most requests and queries take a few milliseconds, which the SDK's
  # default buckets (0, 5, 10, 25, ...) can't tell apart.
  @duration_ms_buckets [0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000]

  @histograms %{
    "steer.http.request.duration_ms": "Phoenix request duration, by route, method and status",
    "steer.db.query.duration_ms":
      "Ecto query total time (queue, query and decode), by source table"
  }

  @counters %{
    "steer.dem.tile_cache": "DEM tile lookups, by result (hit / miss)"
  }

  @memory_kinds [:total, :processes, :binary, :ets, :atom, :code]

  @doc """
  Creates the VM memory gauge and attaches the `:telemetry` handlers that
  record the request and query histograms.
  """
  def setup do
    ObservableGauge.create(:"steer.vm.memory_bytes", &__MODULE__.observe_memory/1, [], %{
      description: "BEAM memory, by kind"
    })

    :telemetry.attach_many(
      __MODULE__,
      [
        [:phoenix, :router_dispatch, :stop],
        [:phoenix, :router_dispatch, :exception],
        [:steer, :repo, :query]
      ],
      &__MODULE__.handle_event/4,
      nil
    )
  end

  @doc false
  def handle_event([:phoenix, :router_dispatch, :stop], %{duration: duration}, meta, _config) do
    record_request(duration, meta, meta.conn.status)
  end

  def handle_event([:phoenix, :router_dispatch, :exception], %{duration: duration}, meta, _config) do
    record_request(duration, meta, Plug.Exception.status(meta.reason))
  end

  def handle_event([:steer, :repo, :query], %{total_time: total_time}, meta, _config) do
    attrs = if meta.source, do: %{source: meta.source}, else: %{}
    record(:"steer.db.query.duration_ms", to_ms(total_time), attrs)
  end

  def handle_event(_event, _measurements, _meta, _config), do: :ok

  @doc false
  def observe_memory(_args) do
    for kind <- @memory_kinds, do: {:erlang.memory(kind), %{kind: kind}}
  end

  @doc """
  Adds 1 to one of the counters listed above, with `attrs`.
  """
  def count(name, attrs) do
    unless :persistent_term.get({__MODULE__, name}, false) do
      Counter.create(name, %{description: Map.fetch!(@counters, name)})
      :persistent_term.put({__MODULE__, name}, true)
    end

    Counter.add(name, 1, attrs)
  end

  defp record_request(duration, meta, status) do
    record(:"steer.http.request.duration_ms", to_ms(duration), %{
      "http.route": meta.route,
      "http.request.method": meta.conn.method,
      "http.response.status_code": status
    })
  end

  defp record(name, value, attrs) do
    unless :persistent_term.get({__MODULE__, name}, false) do
      Histogram.create(name, %{
        description: Map.fetch!(@histograms, name),
        advisory_params: %{explicit_bucket_boundaries: @duration_ms_buckets}
      })

      :persistent_term.put({__MODULE__, name}, true)
    end

    Histogram.record(name, value, attrs)
  end

  defp to_ms(native), do: System.convert_time_unit(native, :native, :microsecond) / 1000
end
