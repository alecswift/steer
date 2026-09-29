defmodule SteerWeb.RouteJSON do
  @moduledoc """
  Routes as GeoJSON that MapLibre can draw directly: a Feature per route,
  with the line's `[lon, lat, z]` positions as its geometry and the name,
  stats and waypoints as its properties.
  """

  alias Steer.Routes.Route

  @doc """
  Renders a FeatureCollection of routes.
  """
  def index(%{routes: routes}) do
    %{type: "FeatureCollection", features: Enum.map(routes, &feature/1)}
  end

  @doc """
  Renders one route as a Feature.
  """
  def show(%{route: route}), do: feature(route)

  # Written by hand rather than with Geo.JSON, which would give the type
  # "LineStringZ" and a "crs" member; GeoJSON (RFC 7946) has neither.
  defp feature(%Route{} = route) do
    %{
      type: "Feature",
      id: route.id,
      geometry: %{
        type: "LineString",
        coordinates: Enum.map(route.geometry.coordinates, &Tuple.to_list/1)
      },
      properties: %{
        name: route.name,
        distance_m: route.distance_m,
        min_ele_m: route.min_ele_m,
        max_ele_m: route.max_ele_m,
        gain_m: route.gain_m,
        loss_m: route.loss_m,
        waypoints: Enum.map(route.waypoints, &Map.take(&1, [:lon, :lat, :geometry_index]))
      }
    }
  end
end
