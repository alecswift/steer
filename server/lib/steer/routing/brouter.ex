defmodule Steer.Routing.BRouter do
  @moduledoc """
  The `Steer.Routing` adapter for the self-hosted BRouter in Docker Compose
  (`config :steer, Steer.Routing.BRouter, base_url: ...`).

  Legs use the stock `hiking-mountain` profile with `path_preference` raised
  from 0 to 10, so that trails beat roads (SC-005). That adds 10 to the cost
  factor of every way that isn't a path, footway, track or road, so a road
  wins only where no trail connects. On the Snoqualmie Pass pairs checked in
  chunk 6.3, any value from 3 to 20 gave the same routes.

  Each call is a `steer.routing.brouter` span with the HTTP status and
  whether BRouter found no route.
  """

  @behaviour Steer.Routing

  require OpenTelemetry.Tracer, as: Tracer

  @params [
    profile: "hiking-mountain",
    "profile:path_preference": 10,
    alternativeidx: 0,
    format: "geojson"
  ]

  # A leg should appear within 1 second of the click (SC-001). This leaves
  # time for Phoenix, the network and, when BRouter fails, a straight
  # fallback leg with elevation from the DEM.
  @timeout_ms 700

  # BRouter answers 400 with one of these when there's no path: no way near
  # a point, no connection between them, or either end on a disconnected
  # island (from BRouter 1.7.10's RoutingEngine).
  @no_route_messages ["not mapped in existing datafile", "no track found", "island detected"]

  @impl true
  def snap([from_lon, from_lat], [to_lon, to_lat]) do
    Tracer.with_span "steer.routing.brouter" do
      response = request("#{from_lon},#{from_lat}|#{to_lon},#{to_lat}")
      result = to_snap_result(response)
      record_span(response, result)
      result
    end
  end

  defp request(lonlats) do
    [
      url: "/brouter",
      params: [{:lonlats, lonlats} | @params],
      # A retry wouldn't fit the time budget; the caller falls back instead.
      retry: false,
      connect_options: [timeout: @timeout_ms],
      receive_timeout: @timeout_ms,
      # BRouter's GeoJSON content type (application/vnd.geo+json) isn't one
      # Req decodes, so it's decoded here.
      decode_body: false
    ]
    |> Keyword.merge(Application.fetch_env!(:steer, __MODULE__))
    |> Req.get()
  end

  defp to_snap_result({:ok, %Req.Response{status: 200, body: body}}) do
    case Jason.decode(body) do
      {:ok, %{"features" => [%{"geometry" => %{"coordinates" => [_, _ | _] = line}} | _]}} ->
        {:ok, line}

      _ ->
        {:error, :invalid_response}
    end
  end

  defp to_snap_result({:ok, %Req.Response{status: 400, body: body}}) do
    if no_route?(body), do: {:error, :no_route}, else: {:error, {:http_error, 400, body}}
  end

  defp to_snap_result({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, {:http_error, status, body}}

  defp to_snap_result({:error, %Req.TransportError{reason: :timeout}}), do: {:error, :timeout}
  defp to_snap_result({:error, exception}), do: {:error, exception}

  defp no_route?(body), do: is_binary(body) and String.contains?(body, @no_route_messages)

  # No route is an expected answer, not an error: the caller falls back to a
  # straight leg. Anything else that fails marks the span as an error.
  defp record_span(response, result) do
    status_attrs =
      case response do
        {:ok, %Req.Response{status: status}} -> %{"http.response.status_code": status}
        {:error, _exception} -> %{}
      end

    Tracer.set_attributes(Map.put(status_attrs, :no_route, result == {:error, :no_route}))

    case result do
      {:ok, _line} -> :ok
      {:error, :no_route} -> :ok
      {:error, reason} -> Tracer.set_status(:error, inspect(reason))
    end
  end
end
