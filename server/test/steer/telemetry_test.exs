defmodule Steer.TelemetryTest do
  # Adds a global logger handler, so it can't run alongside other tests.
  use ExUnit.Case, async: false

  require OpenTelemetry.Tracer, as: Tracer

  @moduletag :capture_log

  # A logger handler that sends each log event to the test process.
  def log(log_event, %{config: %{pid: pid}}), do: send(pid, {:log, log_event})

  setup do
    :ok = :logger.add_handler(:telemetry_test, __MODULE__, %{config: %{pid: self()}})
    # Tests only log warnings and up; let Steer.Telemetry's info logs through.
    Logger.put_module_level(Steer.Telemetry, :info)

    on_exit(fn ->
      :logger.remove_handler(:telemetry_test)
      Logger.delete_module_level(Steer.Telemetry)
    end)
  end

  describe "event/2" do
    test "logs the event name as the message and as event.name, with its attributes" do
      Steer.Telemetry.event("route.saved", route_id: "abc", leg_count: 3)

      assert_receive {:log, %{level: :info, msg: {:string, "route.saved"}, meta: meta}}
      assert meta[:"event.name"] == "route.saved"
      assert meta.route_id == "abc"
      assert meta.leg_count == 3
    end
  end

  describe "trace IDs on logs" do
    test "a log inside a span carries its trace and span IDs" do
      Tracer.with_span "test span" do
        span_ctx = Tracer.current_span_ctx()
        Steer.Telemetry.event("route.deleted")

        assert_receive {:log, %{meta: meta}}
        assert meta.otel_trace_id == OpenTelemetry.Span.hex_trace_id(span_ctx)
        assert meta.otel_span_id == OpenTelemetry.Span.hex_span_id(span_ctx)
      end
    end

    test "a log outside any span has none" do
      Steer.Telemetry.event("route.deleted")

      assert_receive {:log, %{meta: meta}}
      refute Map.has_key?(meta, :otel_trace_id)
    end
  end

  describe "otlp_log_attributes/2" do
    test "drops noisy metadata, keeps the trace IDs, and stringifies file and mfa" do
      log_event = %{
        level: :info,
        msg: {:string, "GET /api/health"},
        meta: %{
          pid: self(),
          domain: [:elixir],
          otel_trace_id: "4bf92f3577b34da6a3ce929d0e0e3675",
          otel_span_id: "29f0993ab15f55ea",
          otel_trace_flags: "01",
          file: ~c"lib/phoenix/logger.ex",
          line: 246,
          mfa: {Phoenix.Logger, :phoenix_endpoint_start, 4},
          request_id: "abc"
        }
      }

      assert Steer.Telemetry.otlp_log_attributes(log_event, []).meta == %{
               otel_trace_id: "4bf92f3577b34da6a3ce929d0e0e3675",
               otel_span_id: "29f0993ab15f55ea",
               otel_trace_flags: "01",
               file: "lib/phoenix/logger.ex",
               line: 246,
               mfa: "Phoenix.Logger.phoenix_endpoint_start/4",
               request_id: "abc"
             }
    end
  end
end
