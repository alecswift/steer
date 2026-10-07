defmodule Steer.Routing do
  @moduledoc """
  Snapping a leg between two clicked points to trails and roads. Phoenix is
  the only part of Steer that talks to the routing engine (FR-012), through
  an adapter that implements this behaviour: `Steer.Routing.BRouter`.

  Points are `[lon, lat]` and lines are lists of `[lon, lat, z]`, as in the
  legs that `Steer.Routes.build/1` takes.
  """

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
end
