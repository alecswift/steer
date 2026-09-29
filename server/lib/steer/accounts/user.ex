defmodule Steer.Accounts.User do
  @moduledoc """
  The owner of routes. It has no fields yet: the MVP has a single implicit
  user and no login.
  """

  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "users" do
    timestamps(type: :utc_datetime)
  end
end
