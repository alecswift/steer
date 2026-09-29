defmodule Steer.Routes.RouteTest do
  use Steer.DataCase, async: true

  alias Steer.Accounts
  alias Steer.Routes.Route

  @line %Geo.LineStringZ{
    coordinates: [{-121.42, 47.44, 900.0}, {-121.41, 47.45, 950.0}, {-121.40, 47.46, 1000.0}],
    srid: 4326
  }

  @valid_attrs %{
    "name" => "Snow Lake",
    "waypoints" => [
      %{"lon" => -121.42, "lat" => 47.44, "geometry_index" => 0},
      %{"lon" => -121.40, "lat" => 47.46, "geometry_index" => 2}
    ],
    "geometry" => @line,
    "distance_m" => 2700.0,
    "min_ele_m" => 900.0,
    "max_ele_m" => 1000.0,
    "gain_m" => 100.0,
    "loss_m" => 0.0
  }

  defp changeset(attrs, user_id \\ Accounts.default_user().id) do
    Route.changeset(%Route{user_id: user_id}, attrs)
  end

  describe "changeset/2" do
    test "is valid with a user, 2 waypoints, a LineStringZ and stats" do
      assert changeset(@valid_attrs).valid?
    end

    test "round-trips through the database" do
      route = Repo.insert!(changeset(@valid_attrs))
      loaded = Repo.get!(Route, route.id)

      assert loaded.geometry == @line

      assert [%{lon: -121.42, lat: 47.44, geometry_index: 0}, %{geometry_index: 2}] =
               loaded.waypoints

      assert loaded.gain_m == 100.0
    end

    test "requires at least 2 waypoints" do
      attrs = Map.update!(@valid_attrs, "waypoints", &Enum.take(&1, 1))

      assert %{waypoints: ["should have at least 2 item(s)"]} = errors_on(changeset(attrs))
    end

    test "requires waypoints" do
      attrs = Map.delete(@valid_attrs, "waypoints")

      assert %{waypoints: ["can't be blank"]} = errors_on(changeset(attrs))
    end

    test "requires each waypoint's lon, lat and geometry_index, within range" do
      attrs =
        Map.put(@valid_attrs, "waypoints", [
          %{"lon" => 181, "lat" => 47.44, "geometry_index" => 0},
          %{"lon" => -121.40, "lat" => -91, "geometry_index" => -1},
          %{}
        ])

      assert %{waypoints: [first, second, third]} = errors_on(changeset(attrs))
      assert first == %{lon: ["must be less than or equal to 180"]}

      assert second == %{
               lat: ["must be greater than or equal to -90"],
               geometry_index: ["must be greater than or equal to 0"]
             }

      assert third == %{
               lon: ["can't be blank"],
               lat: ["can't be blank"],
               geometry_index: ["can't be blank"]
             }
    end

    test "requires the geometry" do
      attrs = Map.delete(@valid_attrs, "geometry")

      assert %{geometry: ["can't be blank"]} = errors_on(changeset(attrs))
    end

    test "requires the geometry to be a LineStringZ in SRID 4326 with at least 2 points" do
      message = "must be a LineStringZ in SRID 4326 with at least 2 points"
      flat = %Geo.LineString{coordinates: [{-121.42, 47.44}, {-121.40, 47.46}], srid: 4326}
      no_srid = %{@line | srid: nil}
      one_point = %{@line | coordinates: [{-121.42, 47.44, 900.0}]}

      for geometry <- [flat, no_srid, one_point] do
        attrs = Map.put(@valid_attrs, "geometry", geometry)
        assert %{geometry: [^message]} = errors_on(changeset(attrs))
      end
    end

    test "requires a user" do
      assert %{user_id: ["can't be blank"]} = errors_on(changeset(@valid_attrs, nil))
    end

    test "rejects a user that doesn't exist" do
      assert {:error, changeset} = Repo.insert(changeset(@valid_attrs, Ecto.UUID.generate()))
      assert %{user: ["does not exist"]} = errors_on(changeset)
    end

    test "requires the name and stats" do
      assert errors_on(changeset(Map.take(@valid_attrs, ["waypoints", "geometry"]))) == %{
               name: ["can't be blank"],
               distance_m: ["can't be blank"],
               min_ele_m: ["can't be blank"],
               max_ele_m: ["can't be blank"],
               gain_m: ["can't be blank"],
               loss_m: ["can't be blank"]
             }
    end
  end
end
