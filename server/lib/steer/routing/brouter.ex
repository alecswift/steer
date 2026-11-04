defmodule Steer.Routing.BRouter do
  @moduledoc """
  The `Steer.Routing` adapter for the self-hosted BRouter in Docker Compose
  (`config :steer, Steer.Routing.BRouter, base_url: ...`).

  Legs use Steer's `steer-hiking` profile (`brouter/profiles`), the stock
  `hiking-mountain` with ways tagged `foot=no` made a last resort rather than
  forbidden, so a leg clicked along a trail mapped as closed to hikers still
  snaps. The adapter reports where a leg runs on such ways.

  `path_preference` is raised from 0 to 10, so that trails beat roads
  (SC-005). That adds 10 to the cost factor of every way that isn't a path,
  footway, track or road, so a road wins only where no trail connects. On the
  Snoqualmie Pass pairs checked in chunk 6.3, any value from 3 to 20 gave the
  same routes.

  Each call is a `steer.routing.brouter` span with the HTTP status, whether
  BRouter found no route, and whether the leg runs on ways tagged `foot=no`.
  """

  @behaviour Steer.Routing

  require OpenTelemetry.Tracer, as: Tracer

  @params [
    profile: "steer-hiking",
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
      {:ok,
       %{"features" => [%{"geometry" => %{"coordinates" => [_, _ | _] = line}} = feature | _]}} ->
        {:ok, %{line: line, foot_no: foot_no(line, get_in(feature, ["properties", "messages"]))}}

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

  # BRouter's messages describe the track a stretch at a time: after a header
  # row, each row ends a stretch at its Longitude and Latitude (millionths of
  # a degree, at one of the line's vertices) and has that stretch's WayTags.
  # The stretches on ways tagged foot=no become ranges of vertex indices,
  # with touching ones joined. Rows that can't be read are skipped: the
  # ranges only mark the line, so a leg is never lost over them.
  defp foot_no(line, [header | rows]) when is_list(header) do
    with lon when lon != nil <- Enum.find_index(header, &(&1 == "Longitude")),
         lat when lat != nil <- Enum.find_index(header, &(&1 == "Latitude")),
         tags when tags != nil <- Enum.find_index(header, &(&1 == "WayTags")) do
      vertices =
        line |> Enum.map(fn [lon, lat | _z] -> {micro(lon), micro(lat)} end) |> Enum.with_index()

      {ranges, _vertices, _start} =
        Enum.reduce(rows, {[], vertices, 0}, fn row, {ranges, vertices, start} ->
          with [_ | _] <- row,
               {:ok, point} <- message_point(Enum.at(row, lon), Enum.at(row, lat)),
               [{_point, finish} | _] = rest <-
                 Enum.drop_while(vertices, fn {v, _i} -> v != point end) do
            foot_no? = "foot=no" in String.split(Enum.at(row, tags) || "")
            {add_range(ranges, foot_no? and finish > start, start, finish), rest, finish}
          else
            _ -> {ranges, vertices, start}
          end
        end)

      Enum.reverse(ranges)
    else
      _ -> []
    end
  end

  defp foot_no(_line, _messages), do: []

  defp add_range(ranges, false, _start, _finish), do: ranges
  defp add_range([[first, start] | ranges], true, start, finish), do: [[first, finish] | ranges]
  defp add_range(ranges, true, start, finish), do: [[start, finish] | ranges]

  defp message_point(lon, lat) when is_binary(lon) and is_binary(lat) do
    with {lon, ""} <- Integer.parse(lon),
         {lat, ""} <- Integer.parse(lat) do
      {:ok, {lon, lat}}
    else
      _ -> :error
    end
  end

  defp message_point(_lon, _lat), do: :error

  defp micro(degrees), do: round(degrees * 1_000_000)

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
      {:ok, %{foot_no: foot_no}} -> Tracer.set_attribute(:foot_no, foot_no != [])
      {:error, :no_route} -> :ok
      {:error, reason} -> Tracer.set_status(:error, inspect(reason))
    end
  end
end
