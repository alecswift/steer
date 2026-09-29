defmodule Steer.Routes.NameTest do
  use Steer.DataCase, async: true

  alias Steer.Accounts
  alias Steer.Accounts.User
  alias Steer.Routes.{Name, Route}

  @date ~D[2026-09-04]
  @a %{"lon" => -121.42, "lat" => 47.44}
  @b %{"lon" => -121.40, "lat" => 47.46}

  # 8368.6 m is 5.2 mi.
  defp attrs(waypoints), do: %{distance_m: 8368.6, waypoints: waypoints}

  defp insert_route!(user_id, name) do
    line = %Geo.LineStringZ{
      coordinates: [{-121.42, 47.44, 900}, {-121.4, 47.46, 950}],
      srid: 4326
    }

    %Route{user_id: user_id}
    |> Route.changeset(%{
      name: name,
      waypoints: [
        %{lon: -121.42, lat: 47.44, geometry_index: 0},
        %{lon: -121.40, lat: 47.46, geometry_index: 1}
      ],
      geometry: line,
      distance_m: 2700.0,
      min_ele_m: 900.0,
      max_ele_m: 950.0,
      gain_m: 50.0,
      loss_m: 0.0
    })
    |> Repo.insert!()
  end

  setup do
    %{user_id: Accounts.default_user().id}
  end

  describe "generate/4" do
    test "names a route that ends away from its start", %{user_id: user_id} do
      assert Name.generate(user_id, attrs([@a, @b]), @date) == "5.2 mi route · Sep 4"
    end

    test "names a route that ends at its start a loop", %{user_id: user_id} do
      assert Name.generate(user_id, attrs([@a, @b, @a]), @date) == "5.2 mi loop · Sep 4"
    end

    test "rounds the distance to a tenth of a mile", %{user_id: user_id} do
      assert Name.generate(user_id, %{attrs([@a, @b]) | distance_m: 100.0}, ~D[2026-12-25]) ==
               "0.1 mi route · Dec 25"
    end

    test "numbers duplicates from (2)", %{user_id: user_id} do
      insert_route!(user_id, "5.2 mi route · Sep 4")
      assert Name.generate(user_id, attrs([@a, @b]), @date) == "5.2 mi route · Sep 4 (2)"

      insert_route!(user_id, "5.2 mi route · Sep 4 (2)")
      assert Name.generate(user_id, attrs([@a, @b]), @date) == "5.2 mi route · Sep 4 (3)"
    end

    test "only counts the user's own routes as taken", %{user_id: user_id} do
      other = Repo.insert!(%User{})
      insert_route!(other.id, "5.2 mi route · Sep 4")

      assert Name.generate(user_id, attrs([@a, @b]), @date) == "5.2 mi route · Sep 4"
    end

    test "doesn't count the route being renamed as taken", %{user_id: user_id} do
      route = insert_route!(user_id, "5.2 mi route · Sep 4")

      assert Name.generate(user_id, attrs([@a, @b]), @date, route.id) == "5.2 mi route · Sep 4"
    end
  end
end
