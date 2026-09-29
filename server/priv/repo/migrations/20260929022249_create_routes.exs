defmodule Steer.Repo.Migrations.CreateRoutes do
  use Ecto.Migration

  @doc """
  Creates the routes table with an owner, waypoints, 3D geometry and metric stats.

  Indexes the owner reference and deletes routes when their owner is deleted.
  """
  def change do
    create table(:routes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :name, :text, null: false
      # An ordered list of {lon, lat, geometry_index}, where geometry_index is
      # the vertex in `geometry` the waypoint lands on.
      add :waypoints, :map, null: false
      add :geometry, :"geometry(LineStringZ, 4326)", null: false
      add :distance_m, :float, null: false
      add :min_ele_m, :float, null: false
      add :max_ele_m, :float, null: false
      add :gain_m, :float, null: false
      add :loss_m, :float, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:routes, [:user_id])
  end
end
