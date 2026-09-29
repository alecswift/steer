defmodule Steer.Routes.Waypoint do
  @moduledoc """
  One user-clicked point in a route. `geometry_index` is the vertex in the
  route's geometry where the waypoint lands, so edit mode can split the line
  back into legs without re-snapping.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  embedded_schema do
    field :lon, :float
    field :lat, :float
    field :geometry_index, :integer
  end

  def changeset(waypoint, attrs) do
    waypoint
    |> cast(attrs, [:lon, :lat, :geometry_index])
    |> validate_required([:lon, :lat, :geometry_index])
    |> validate_number(:lon, greater_than_or_equal_to: -180, less_than_or_equal_to: 180)
    |> validate_number(:lat, greater_than_or_equal_to: -90, less_than_or_equal_to: 90)
    |> validate_number(:geometry_index, greater_than_or_equal_to: 0)
  end
end
