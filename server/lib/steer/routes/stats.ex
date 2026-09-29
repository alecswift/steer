defmodule Steer.Routes.Stats do
  @threshold_m 5

  @moduledoc """
  A route's stats, computed from its line: distance along the ellipsoid, and
  min/max elevation and gain/loss from the Z values. All in meters.

  Distance is map distance. PostGIS measures a geography with Z as 3D slope
  length, so the Z values are dropped first.

  Gain and loss use a #{@threshold_m} m hysteresis to ignore elevation noise: a climb or
  descent counts only once it goes more than the threshold past the last
  turning point, and then counts in full. Wobbles smaller than that (DEM
  noise on flat ground) add nothing, and a real climb loses nothing.
  """

  alias Steer.Repo

  @doc """
  Returns `%{distance_m, min_ele_m, max_ele_m, gain_m, loss_m}` for a
  `Geo.LineStringZ` in SRID 4326.
  """
  def compute(%Geo.LineStringZ{coordinates: coordinates} = line) do
    %{rows: [[distance_m]]} = Repo.query!("SELECT ST_Length(ST_Force2D($1)::geography)", [line])
    # `/ 1` makes integer elevations floats, like the stats columns.
    elevations = Enum.map(coordinates, fn {_lon, _lat, z} -> z / 1 end)
    {gain_m, loss_m} = gain_and_loss(elevations)

    %{
      distance_m: distance_m,
      min_ele_m: Enum.min(elevations),
      max_ele_m: Enum.max(elevations),
      gain_m: gain_m,
      loss_m: loss_m
    }
  end

  # Walks the elevations with a direction: :unknown until the first move past
  # the threshold, then :up or :down. `from` is the last turning point and
  # `to` the furthest point reached since, so a climb is `to - from`.
  defp gain_and_loss([first | rest]) do
    acc = %{
      direction: :unknown,
      low: first,
      high: first,
      from: first,
      to: first,
      gain: 0.0,
      loss: 0.0
    }

    rest
    |> Enum.reduce(acc, &step/2)
    |> finish()
  end

  defp step(z, %{direction: :unknown} = acc) do
    acc = %{acc | low: min(acc.low, z), high: max(acc.high, z)}

    cond do
      z - acc.low > @threshold_m -> %{acc | direction: :up, from: acc.low, to: z}
      acc.high - z > @threshold_m -> %{acc | direction: :down, from: acc.high, to: z}
      true -> acc
    end
  end

  defp step(z, %{direction: :up} = acc) do
    cond do
      z >= acc.to -> %{acc | to: z}
      acc.to - z > @threshold_m -> turn(acc, :down, z)
      true -> acc
    end
  end

  defp step(z, %{direction: :down} = acc) do
    cond do
      z <= acc.to -> %{acc | to: z}
      z - acc.to > @threshold_m -> turn(acc, :up, z)
      true -> acc
    end
  end

  # Commits the climb or descent that just ended at `to`, and starts the next.
  defp turn(acc, direction, z), do: %{commit(acc) | direction: direction, from: acc.to, to: z}

  defp commit(%{direction: :up} = acc), do: %{acc | gain: acc.gain + (acc.to - acc.from)}
  defp commit(%{direction: :down} = acc), do: %{acc | loss: acc.loss + (acc.from - acc.to)}
  defp commit(acc), do: acc

  defp finish(acc) do
    %{gain: gain, loss: loss} = commit(acc)
    {gain, loss}
  end
end
