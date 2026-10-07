defmodule Steer.Routing do
  @moduledoc """
  Snapping a leg between two clicked points to trails and roads. Phoenix is
  the only part of Steer that talks to the routing engine (FR-012), through
  an adapter that implements this behaviour: `Steer.Routing.BRouter`.

  Points are `[lon, lat]` and lines are lists of `[lon, lat, z]`, as in the
  legs that `Steer.Routes.build/1` takes.

  Each straight fallback leg counts toward `steer.snap.fallback`, by `reason`
  (`no_route`, `timeout` or `error`).
  """

  alias Steer.Elevation
  alias Steer.Telemetry.Metrics

  @adapter Steer.Routing.BRouter

  @typedoc "A clicked point, `[lon, lat]`."
  @type point :: [number()]

  @typedoc """
  A leg's vertices, `[lon, lat, z]` with Z in meters, or `[lon, lat]` where
  the engine has no elevation.
  """
  @type line :: [[number()]]

  @doc """
  Finds the best path from one point to another, starting and ending at the
  nearest points on the network rather than the clicked ones.
  `{:error, :no_route}` means the engine has no path between them.
  """
  @callback snap(from :: point(), to :: point()) ::
              {:ok, line()} | {:error, :no_route | :timeout | term()}

  @doc """
  Snaps the leg from one point to the other, or falls back to a straight
  line with Z from the DEM whenever the routing engine fails (FR-004).
  Returns `{:ok, %{coordinates: [[lon, lat, z]], snapped: boolean}}`, or
  `{:error, reason}` when the DEM can't be read either.

  A snapped leg keeps the engine's Z values, and takes the DEM's where the
  engine has none.
  """
  def snap_or_straight(from, to) do
    case @adapter.snap(from, to) do
      {:ok, line} ->
        with {:ok, coordinates} <- Elevation.fill_z(line),
             do: {:ok, %{coordinates: coordinates, snapped: true}}

      {:error, reason} ->
        Metrics.count(:"steer.snap.fallback", %{reason: fallback_reason(reason)})

        with {:ok, coordinates} <- Elevation.sample_line([from, to]),
             do: {:ok, %{coordinates: coordinates, snapped: false}}
    end
  end

  defp fallback_reason(:no_route), do: :no_route
  defp fallback_reason(:timeout), do: :timeout
  defp fallback_reason(_reason), do: :error
end
