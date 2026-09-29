defmodule Steer.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  @doc """
  Creates the users table with a UUID primary key and timestamps.

  The MVP has one implicit user (see `Steer.Accounts.default_user/0`), but
  routes already point at an owner.
  """
  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true

      timestamps(type: :utc_datetime)
    end
  end
end
