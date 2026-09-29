defmodule Steer.RoutesTest do
  use Steer.DataCase, async: true

  alias Steer.Routes

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
        "must each have a boolean snapped and at least 2 [lon, lat, z] coordinates in range"

      for bad <- [
            leg([[0.0, 0.0, 100]]),
            leg([[0.0, 0.0], [0.01, 0.0]]),
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
end
