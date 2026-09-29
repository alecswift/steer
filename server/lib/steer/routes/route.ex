defmodule Steer.Routes.Route do
  @moduledoc """
  A saved route: its ordered waypoints, the resolved line with elevation
  (a `Geo.LineStringZ` in SRID 4326), and stats computed from that line.
  Everything is metric; the frontend converts for display.
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias Steer.Routes.Waypoint

  @stats [:distance_m, :min_ele_m, :max_ele_m, :gain_m, :loss_m]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "routes" do
    field :name, :string
    embeds_many :waypoints, Waypoint, on_replace: :delete
    field :geometry, Geo.PostGIS.Geometry
    field :distance_m, :float
    field :min_ele_m, :float
    field :max_ele_m, :float
    field :gain_m, :float
    field :loss_m, :float

    belongs_to :user, Steer.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc """
  Casts a route's name, geometry and stats, and its waypoints. The owner is
  never cast: set `user_id` on the struct.
  """
  def changeset(route, attrs) do
    route
    |> cast(attrs, [:name, :geometry | @stats])
    |> cast_embed(:waypoints, required: true)
    |> validate_required([:user_id, :name, :geometry | @stats])
    |> validate_length(:waypoints, min: 2)
    |> validate_change(:geometry, &validate_line/2)
    |> assoc_constraint(:user)
  end

  defp validate_line(_field, %Geo.LineStringZ{srid: 4326, coordinates: [_, _ | _]}), do: []

  defp validate_line(field, _geometry),
    do: [{field, "must be a LineStringZ in SRID 4326 with at least 2 points"}]
end
