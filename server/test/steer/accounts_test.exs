defmodule Steer.AccountsTest do
  use Steer.DataCase, async: true

  alias Steer.Accounts
  alias Steer.Accounts.User

  describe "default_user/0" do
    test "creates the default user on first use" do
      assert Repo.aggregate(User, :count) == 0
      assert %User{id: id} = Accounts.default_user()
      assert Repo.get!(User, id)
    end

    test "returns the same user every time" do
      user = Accounts.default_user()

      assert Accounts.default_user() == user
      assert Repo.aggregate(User, :count) == 1
    end
  end
end
