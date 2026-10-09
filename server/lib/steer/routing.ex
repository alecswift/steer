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

  # Far longer than a leg between two clicks on a hike. The cap bounds the
  # engine's search, and the samples and tiles of a straight fallback leg,
  # which would otherwise grow with the leg (a leg across the world would
  # be about 670,000 samples in thousands of tiles).
  @max_leg_m 50_000

  @doc """
  The longest leg, in meters, that's snapped or sampled along its length.
  """
  def max_leg_m, do: @max_leg_m

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
  Returns `{:ok, %{coordinates: [[lon, lat, z]], snapped: boolean}}`,
  `{:error, :too_far}` when the points are more than #{div(@max_leg_m, 1000)} km apart, or
  `{:error, reason}` when the DEM can't be read either.

  A snapped leg keeps the engine's Z values, and takes the DEM's where the
  engine has none.
  """
  def snap_or_straight(from, to) do
    if Elevation.distance_m(from, to) > @max_leg_m,
      do: {:error, :too_far},
      else: snap_or_sample(from, to)
  end

  defp snap_or_sample(from, to) do
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
