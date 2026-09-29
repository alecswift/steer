defmodule Steer.Repo.Migrations.EnablePostgis do
  use Ecto.Migration

  def up do
    execute "CREATE EXTENSION IF NOT EXISTS postgis"
  end

  def down, do: :ok
end
