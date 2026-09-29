defmodule Steer.Accounts do
  @moduledoc """
  Users. The MVP has no accounts: every route belongs to one implicit default
  user, so accounts can be added later without migrating data.
  """

  alias Steer.Accounts.User
  alias Steer.Repo

  @default_user_id "00000000-0000-0000-0000-000000000001"

  @doc """
  Returns the implicit default user, creating it on first use.
  """
  def default_user do
    case Repo.get(User, @default_user_id) do
      nil ->
        # A concurrent first call may have just created it, so a conflict is fine.
        Repo.insert!(%User{id: @default_user_id}, on_conflict: :nothing)
        Repo.get!(User, @default_user_id)

      user ->
        user
    end
  end
end
