defmodule SteerWeb.SnapJSON do
  @moduledoc """
  A snapped or straight leg as a GeoJSON Feature: its `[lon, lat, z]`
  positions as a LineString, and whether it follows trails and roads as
  `properties.snapped`. `coordinates` and `snapped` are the fields of a leg
  that `POST /api/routes` takes.
  """

  @doc """
  Renders one leg as a Feature.
  """
  def show(%{leg: leg}) do
    %{
      type: "Feature",
      geometry: %{type: "LineString", coordinates: leg.coordinates},
      properties: %{snapped: leg.snapped}
    }
  end
end
