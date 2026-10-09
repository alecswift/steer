defmodule Steer.RoutesTest do
  use Steer.DataCase, async: true

  alias Steer.Accounts
  alias Steer.Accounts.User
  alias Steer.Routes
  alias Steer.Routes.Route

  # Waypoints A, B, C along the equator, 0.01° apart, where 0.01° of longitude
  # is 6378137 m × 0.01 × π / 180 ≈ 1113.195 m.
  @leg_m 6_378_137 * 0.01 * :math.pi() / 180
  @a %{"lon" => 0.0, "lat" => 0.0}
  @b %{"lon" => 0.01, "lat" => 0.0}
  @c %{"lon" => 0.02, "lat" => 0.0}

  defp leg(coordinates, snapped \\ true),
    do: %{"coordinates" => coordinates, "snapped" => snapped}

  describe "build/1" do
    test "joins 2 legs, dropping the shared joint vertex" do
      assert {:ok, attrs} =
               Routes.build(%{
                 "waypoints" => [@a, @b, @c],
                 "legs" => [
                   leg([[0.0, 0.0, 100], [0.005, 0.0, 150], [0.01, 0.0, 200]]),
                   leg([[0.01, 0.0, 200], [0.02, 0.0, 180]])
                 ]
               })

      assert attrs.geometry == %Geo.LineStringZ{
               coordinates: [
                 {0.0, 0.0, 100.0},
                 {0.005, 0.0, 150.0},
                 {0.01, 0.0, 200.0},
                 {0.02, 0.0, 180.0}
               ],
               srid: 4326
             }

      assert Enum.map(attrs.waypoints, & &1["geometry_index"]) == [0, 2, 3]
      assert_in_delta attrs.distance_m, 2 * @leg_m, 0.001

      assert %{min_ele_m: 100.0, max_ele_m: 200.0, gain_m: 100.0, loss_m: 20.0} = attrs
    end

    test "joins 3 legs" do
      d = %{"lon" => 0.03, "lat" => 0.0}

      assert {:ok, attrs} =
               Routes.build(%{
                 "waypoints" => [@a, @b, @c, d],
                 "legs" => [
                   leg([[0.0, 0.0, 100], [0.01, 0.0, 100]]),
                   leg([[0.01, 0.0, 100], [0.015, 0.0, 100], [0.02, 0.0, 100]]),
                   leg([[0.02, 0.0, 100], [0.025, 0.0, 100], [0.03, 0.0, 100]])
                 ]
               })

      assert length(attrs.geometry.coordinates) == 6
      assert Enum.map(attrs.waypoints, & &1["geometry_index"]) == [0, 1, 3, 5]
      assert_in_delta attrs.distance_m, 3 * @leg_m, 0.001
    end

    test "builds a closed loop that ends where it starts" do
      assert {:ok, attrs} =
               Routes.build(%{
                 "waypoints" => [@a, @b, @a],
                 "legs" => [
                   leg([[0.0, 0.0, 100], [0.01, 0.0, 300]]),
                   leg([[0.01, 0.0, 300], [0.0, 0.0, 100]])
                 ]
               })

      assert attrs.geometry.coordinates ==
               [{0.0, 0.0, 100.0}, {0.01, 0.0, 300.0}, {0.0, 0.0, 100.0}]

      assert Enum.map(attrs.waypoints, & &1["geometry_index"]) == [0, 1, 2]
      assert_in_delta attrs.distance_m, 2 * @leg_m, 0.001
      assert %{gain_m: 200.0, loss_m: 200.0} = attrs
    end

    test "keeps both joint vertices when a leg doesn't start where the last ended" do
      # A snapped leg ends on the trail, and a straight fallback leg starts
      # from the clicked point beside it.
      assert {:ok, attrs} =
               Routes.build(%{
                 "waypoints" => [@a, @b, @c],
                 "legs" => [
                   leg([[0.0, 0.0, 100], [0.0099, 0.0, 100]]),
                   leg([[0.01, 0.0, 100], [0.02, 0.0, 100]], false)
                 ]
               })

      assert length(attrs.geometry.coordinates) == 4
      assert Enum.map(attrs.waypoints, & &1["geometry_index"]) == [0, 1, 3]
    end

    test "keeps each waypoint's own fields" do
      assert {:ok, %{waypoints: [first | _]}} =
               Routes.build(%{
                 "waypoints" => [@a, @b],
                 "legs" => [leg([[0.0, 0.0, 100], [0.01, 0.0, 100]])]
               })

      assert first == %{"lon" => 0.0, "lat" => 0.0, "geometry_index" => 0}
    end

    test "rejects fewer than 2 waypoints" do
      for waypoints <- [nil, [], [@a], ["not a map", @b]] do
        assert {:error, changeset} = Routes.build(%{"waypoints" => waypoints, "legs" => []})
        assert %{waypoints: ["must be a list of at least 2 waypoints"]} = errors_on(changeset)
      end
    end

    test "rejects a leg count that doesn't match the waypoints" do
      one_leg = [leg([[0.0, 0.0, 100], [0.01, 0.0, 100]])]

      for legs <- [nil, [], one_leg ++ one_leg] do
        assert {:error, changeset} = Routes.build(%{"waypoints" => [@a, @b], "legs" => legs})

        assert %{legs: ["must have one leg between each pair of consecutive waypoints"]} =
                 errors_on(changeset)
      end
    end

    test "rejects malformed legs" do
      message =
        "must each have a boolean snapped and at least 2 [lon, lat, z] or [lon, lat] coordinates in range"

      for bad <- [
            leg([[0.0, 0.0, 100]]),
            leg([[0.0, 0.0, 100], [0.01]]),
            leg([[0.0, 0.0, 100], [0.01, 0.0, 100, 1]]),
            leg([[0.0, 0.0, 100], [0.01, 0.0, "high"]]),
            leg([[0.0, 0.0, 100], [181.0, 0.0, 100]]),
            leg([[0.0, 0.0, 100], [0.0, -91.0, 100]]),
            leg([[0.0, 0.0, 100], [0.01, 0.0, 100]], nil),
            %{"coordinates" => [[0.0, 0.0, 100], [0.01, 0.0, 100]]}
          ] do
        assert {:error, changeset} = Routes.build(%{"waypoints" => [@a, @b], "legs" => [bad]})
        assert %{legs: [^message]} = errors_on(changeset)
      end
    end
  end

  describe "build/1 with legs missing Z" do
    # The zoom 12 Terrarium tile with the summit of Snoqualmie Mountain in it,
    # and two pixel centers in it with their elevations (see
    # Steer.ElevationTest). Tests here stub the tile rather than expect it,
    # since another test may already have cached it.
    @tile File.read!("test/fixtures/terrarium_12_666_1432.png")
    @summit [-121.41626358032227, 47.45862098585447]
    @summit_z 1907.484375
    @north [-121.41626358032227, 47.46140645090276]
    @north_z 1711.12109375

    defp summit_to_north(legs),
      do: %{
        "waypoints" => [
          %{"lon" => Enum.at(@summit, 0), "lat" => Enum.at(@summit, 1)},
          %{"lon" => Enum.at(@north, 0), "lat" => Enum.at(@north, 1)}
        ],
        "legs" => legs
      }

    test "samples a leg with no Z along its length, as Phoenix samples a straight leg" do
      Req.Test.stub(Steer.Elevation.Tiles, &Plug.Conn.send_resp(&1, 200, @tile))

      assert {:ok, attrs} = Routes.build(summit_to_north([leg([@summit, @north], false)]))

      # Every 30 m or less over 310 m (see Steer.ElevationTest).
      coordinates = attrs.geometry.coordinates
      assert length(coordinates) == 12
      assert hd(coordinates) == List.to_tuple(@summit ++ [@summit_z])
      assert List.last(coordinates) == List.to_tuple(@north ++ [@north_z])
      assert Enum.map(attrs.waypoints, & &1["geometry_index"]) == [0, 11]
      assert attrs.max_ele_m == @summit_z
      assert attrs.loss_m > 0
    end

    test "fills only the points missing Z in a leg that has some" do
      Req.Test.stub(Steer.Elevation.Tiles, &Plug.Conn.send_resp(&1, 200, @tile))

      assert {:ok, attrs} =
               Routes.build(summit_to_north([leg([@summit, @north ++ [1700.0]])]))

      assert attrs.geometry.coordinates ==
               [List.to_tuple(@summit ++ [@summit_z]), List.to_tuple(@north ++ [1700.0])]
    end

    test "only fills the ends of a leg with no Z that's too long to sample" do
      Req.Test.stub(Steer.Elevation.Tiles, &Plug.Conn.send_resp(&1, 200, @tile))
      # About 60 km east of the summit. The stub serves the same tile there.
      far = [-120.62, 47.45]

      assert {:ok, attrs} =
               Routes.build(%{
                 "waypoints" => [@a, @b],
                 "legs" => [leg([@summit, far], false)]
               })

      assert [{_, _, @summit_z}, {-120.62, 47.45, _z}] = attrs.geometry.coordinates
    end

    test "fails when the DEM can't be read" do
      Req.Test.stub(Steer.Elevation.Tiles, &Plug.Conn.send_resp(&1, 503, ""))
      # In a tile no other test fetches, so it can't be cached already.
      leg = leg([[10.0, 10.0], [10.001, 10.0]], false)

      assert Routes.build(%{"waypoints" => [@a, @b], "legs" => [leg]}) ==
               {:error, :elevation_unavailable}
    end
  end

  describe "CRUD" do
    setup do
      %{user: Accounts.default_user()}
    end

    defp params(name \\ nil) do
      %{
        "name" => name,
        "waypoints" => [@a, @b],
        "legs" => [leg([[0.0, 0.0, 100], [0.01, 0.0, 150]])]
      }
    end

    defp today, do: Calendar.strftime(Date.utc_today(), "%b %-d")

    test "create_route/2 stores the built route with its name", %{user: user} do
      assert {:ok, %Route{} = route} = Routes.create_route(user, params("Snow Lake"))

      assert route.user_id == user.id
      assert route.name == "Snow Lake"
      assert [%{geometry_index: 0}, %{geometry_index: 1}] = route.waypoints
      assert route.gain_m == 50.0
      assert Repo.get!(Route, route.id).geometry == route.geometry
    end

    test "create_route/2 trims the name, and generates one when it's blank", %{user: user} do
      assert {:ok, %{name: "Snow Lake"}} = Routes.create_route(user, params("  Snow Lake "))

      for blank <- [nil, "", "   "] do
        assert {:ok, route} = Routes.create_route(user, params(blank))
        assert route.name =~ ~r/^0\.7 mi route · #{today()}( \(\d\))?$/
      end

      assert user |> Routes.list_routes() |> Enum.map(& &1.name) |> Enum.uniq() |> length() == 4
    end

    test "create_route/2 returns build and changeset errors", %{user: user} do
      assert {:error, changeset} = Routes.create_route(user, Map.delete(params(), "legs"))
      assert %{legs: [_]} = errors_on(changeset)

      bad_waypoints = Map.put(params(), "waypoints", [@a, %{"lon" => 0.01}])
      assert {:error, changeset} = Routes.create_route(user, bad_waypoints)
      assert %{waypoints: [%{}, %{lat: ["can't be blank"]}]} = errors_on(changeset)

      assert {:error, changeset} = Routes.create_route(user, params(42))
      assert %{name: ["is invalid"]} = errors_on(changeset)
    end

    test "list_routes/1 returns only the user's routes, newest first", %{user: user} do
      {:ok, older} = Routes.create_route(user, params("Older"))
      {:ok, newer} = Routes.create_route(user, params("Newer"))
      {:ok, _other} = Routes.create_route(Repo.insert!(%User{}), params("Someone else's"))

      Repo.update_all(from(r in Route, where: r.id == ^older.id),
        set: [inserted_at: ~U[2026-01-01 00:00:00Z]]
      )

      assert Enum.map(Routes.list_routes(user), & &1.id) == [newer.id, older.id]
    end

    test "get_route!/2 finds only the user's own routes", %{user: user} do
      {:ok, route} = Routes.create_route(user, params("Mine"))
      {:ok, other} = Routes.create_route(Repo.insert!(%User{}), params("Theirs"))

      assert Routes.get_route!(user, route.id).id == route.id
      assert_raise Ecto.NoResultsError, fn -> Routes.get_route!(user, other.id) end
    end

    test "update_route/2 rebuilds the route and keeps its generated name", %{user: user} do
      {:ok, route} = Routes.create_route(user, params())

      longer = %{
        "waypoints" => [@a, @b, @c],
        "legs" => [
          leg([[0.0, 0.0, 100], [0.01, 0.0, 150]]),
          leg([[0.01, 0.0, 150], [0.02, 0.0, 150]])
        ]
      }

      assert {:ok, updated} = Routes.update_route(route, longer)
      assert updated.id == route.id
      assert updated.name == "1.4 mi route · #{today()}"
      assert length(updated.geometry.coordinates) == 3

      # Saving it again without a name doesn't count its own name as taken.
      assert {:ok, %{name: name}} = Routes.update_route(updated, longer)
      assert name == updated.name
    end

    test "update_route/2 returns errors and leaves the route as it was", %{user: user} do
      {:ok, route} = Routes.create_route(user, params("Snow Lake"))

      assert {:error, _changeset} = Routes.update_route(route, Map.delete(params(), "legs"))
      assert Repo.get!(Route, route.id).name == "Snow Lake"
    end

    test "delete_route/1 removes the route", %{user: user} do
      {:ok, route} = Routes.create_route(user, params("Snow Lake"))

      assert {:ok, _route} = Routes.delete_route(route)
      assert Routes.list_routes(user) == []
    end
  end
end
