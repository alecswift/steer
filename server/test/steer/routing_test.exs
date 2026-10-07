defmodule Steer.RoutingTest do
  # Uses the shared tile cache (see Steer.Elevation.TilesTest).
  use ExUnit.Case, async: false

  alias Steer.Elevation.Tiles
  alias Steer.Routing.BRouter

  # The zoom 12 Terrarium tile with the summit of Snoqualmie Mountain in it,
  # and two pixel centers in it with their elevations (see
  # Steer.ElevationTest).
  @tile File.read!("test/fixtures/terrarium_12_666_1432.png")
  @summit [-121.41626358032227, 47.45862098585447]
  @summit_z 1907.484375
  @north [-121.41626358032227, 47.46140645090276]
  @north_z 1711.12109375

  setup do
    :ets.delete_all_objects(Tiles)
    :ok
  end

  defp brouter_track(coordinates) do
    Jason.encode!(%{
      "type" => "FeatureCollection",
      "features" => [
        %{
          "type" => "Feature",
          "properties" => %{},
          "geometry" => %{"type" => "LineString", "coordinates" => coordinates}
        }
      ]
    })
  end

  defp brouter_failure(conn, :no_route),
    do: Plug.Conn.send_resp(conn, 400, "no track found at pass=0")

  defp brouter_failure(conn, :timeout), do: Req.Test.transport_error(conn, :timeout)
  defp brouter_failure(conn, :other_error), do: Plug.Conn.send_resp(conn, 500, "")

  describe "snap_or_straight/2" do
    test "returns BRouter's leg, with its elevations, as snapped" do
      track = [[-121.4163, 47.4587, 1890.5], [-121.4162, 47.4613, 1720.25]]
      Req.Test.stub(BRouter, &Plug.Conn.send_resp(&1, 200, brouter_track(track)))
      # No tile is fetched: Req.Test fails any request to Tiles without a stub.

      assert Steer.Routing.snap_or_straight(@summit, @north) ==
               {:ok, %{coordinates: track, snapped: true}}
    end

    test "fills a snapped leg's missing elevations from the DEM" do
      track = [@summit, [-121.4162, 47.4600, 1800.0], @north]
      Req.Test.stub(BRouter, &Plug.Conn.send_resp(&1, 200, brouter_track(track)))
      Req.Test.expect(Tiles, &Plug.Conn.send_resp(&1, 200, @tile))

      assert Steer.Routing.snap_or_straight(@summit, @north) ==
               {:ok,
                %{
                  coordinates: [
                    @summit ++ [@summit_z],
                    [-121.4162, 47.4600, 1800.0],
                    @north ++ [@north_z]
                  ],
                  snapped: true
                }}
    end

    for failure <- [:no_route, :timeout, :other_error] do
      test "falls back to a straight leg with Z from the DEM on #{failure}" do
        Req.Test.stub(BRouter, &brouter_failure(&1, unquote(failure)))
        Req.Test.expect(Tiles, &Plug.Conn.send_resp(&1, 200, @tile))

        assert {:ok, %{coordinates: coordinates, snapped: false}} =
                 Steer.Routing.snap_or_straight(@summit, @north)

        # From the clicked point to the other, every 30 m or less (see
        # Steer.ElevationTest).
        assert length(coordinates) == 12
        assert hd(coordinates) == @summit ++ [@summit_z]
        assert List.last(coordinates) == @north ++ [@north_z]
      end
    end

    # No stubs: Req.Test fails any request to BRouter or the tiles.
    test "refuses points more than 50 km apart" do
      # About 60 km east of the summit.
      assert Steer.Routing.snap_or_straight(@summit, [-120.62, 47.45]) == {:error, :too_far}
    end

    test "fails when neither BRouter nor the DEM answers" do
      Req.Test.stub(BRouter, &Req.Test.transport_error(&1, :timeout))
      Req.Test.stub(Tiles, &Req.Test.transport_error(&1, :econnrefused))

      assert Steer.Routing.snap_or_straight(@summit, @north) ==
               {:error, %Req.TransportError{reason: :econnrefused}}
    end
  end
end
