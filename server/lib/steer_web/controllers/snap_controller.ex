defmodule SteerWeb.SnapController do
  use SteerWeb, :controller

  alias Steer.Routing
  alias Steer.Telemetry.Metrics

  @doc """
  Snaps the leg from `from` to `to` (each `[lon, lat]`) to trails and roads,
  or falls back to a straight line (see `Steer.Routing.snap_or_straight/2`),
  and returns it as a GeoJSON Feature.

  Answers 400 when a point isn't a `[lon, lat]` in range, 422 when the
  points are too far apart for one leg, and 502 when neither the routing
  engine nor the DEM answers. Each leg returned counts toward
  `steer.snap.duration_ms`, by `snapped`.
  """
  def create(conn, %{"from" => from, "to" => to}) do
    if point?(from) and point?(to) do
      started = System.monotonic_time()

      case Routing.snap_or_straight(from, to) do
        {:ok, leg} ->
          Metrics.record(:"steer.snap.duration_ms", elapsed_ms(started), %{snapped: leg.snapped})
          render(conn, :show, leg: leg)

        {:error, :too_far} ->
          error(conn, :unprocessable_entity, "from and to are too far apart for one leg")

        {:error, _reason} ->
          error(conn, :bad_gateway, "neither the routing engine nor the DEM answered")
      end
    else
      bad_request(conn)
    end
  end

  def create(conn, _params), do: bad_request(conn)

  defp point?([lon, lat]),
    do:
      is_number(lon) and lon >= -180 and lon <= 180 and is_number(lat) and lat >= -90 and
        lat <= 90

  defp point?(_point), do: false

  defp bad_request(conn),
    do: error(conn, :bad_request, "from and to must each be a [lon, lat] in range")

  # The same shape as SteerWeb.ErrorJSON's errors.
  defp error(conn, status, detail) do
    conn
    |> put_status(status)
    |> json(%{errors: %{detail: detail}})
  end

  defp elapsed_ms(started),
    do: System.convert_time_unit(System.monotonic_time() - started, :native, :microsecond) / 1000
end
