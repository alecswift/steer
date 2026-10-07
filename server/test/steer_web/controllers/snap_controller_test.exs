defmodule SteerWeb.SnapControllerTest do
  # Uses the shared tile cache (see Steer.Elevation.TilesTest).
  use SteerWeb.ConnCase, async: false

  alias Steer.Elevation.Tiles
  alias Steer.Routing.BRouter

  # The fixture tile and two points in it with their elevations (see
  # Steer.RoutingTest).
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
      "features" => [%{"type" => "Feature", "geometry" => %{"coordinates" => coordinates}}]
    })
  end

  defp snap(conn, body), do: post(conn, ~p"/api/snap", body)

  describe "POST /api/snap" do
    test "returns a snapped leg as a GeoJSON Feature", %{conn: conn} do
      track = [[-121.4163, 47.4587, 1890.5], [-121.4162, 47.4613, 1720.25]]
      Req.Test.stub(BRouter, &Plug.Conn.send_resp(&1, 200, brouter_track(track)))

      assert conn |> snap(%{from: @summit, to: @north}) |> json_response(200) == %{
               "type" => "Feature",
               "geometry" => %{"type" => "LineString", "coordinates" => track},
               "properties" => %{"snapped" => true}
             }
    end

    test "returns a straight leg with Z from the DEM when there's no route", %{conn: conn} do
      Req.Test.stub(BRouter, &Plug.Conn.send_resp(&1, 400, "no track found at pass=0"))
      Req.Test.expect(Tiles, &Plug.Conn.send_resp(&1, 200, @tile))

      assert %{
               "geometry" => %{"type" => "LineString", "coordinates" => coordinates},
               "properties" => %{"snapped" => false}
             } = conn |> snap(%{from: @summit, to: @north}) |> json_response(200)

      assert hd(coordinates) == @summit ++ [@summit_z]
      assert List.last(coordinates) == @north ++ [@north_z]
    end

    test "answers 502 when neither BRouter nor the DEM answers", %{conn: conn} do
      Req.Test.stub(BRouter, &Req.Test.transport_error(&1, :timeout))
      Req.Test.stub(Tiles, &Req.Test.transport_error(&1, :econnrefused))

      assert %{"errors" => %{"detail" => _}} =
               conn |> snap(%{from: @summit, to: @north}) |> json_response(502)
    end

    # No stubs: Req.Test fails any request to BRouter or the tiles.
    test "answers 422 for points too far apart for one leg", %{conn: conn} do
      assert %{"errors" => %{"detail" => _}} =
               conn |> snap(%{from: @summit, to: [-120.5, 47.4]}) |> json_response(422)
    end

    for {name, body} <- [
          {"no to", %{from: [-121.4, 47.4]}},
          {"a point that isn't a list", %{from: "-121.4,47.4", to: [-121.4, 47.4]}},
          {"a point with Z", %{from: [-121.4, 47.4, 1000], to: [-121.4, 47.4]}},
          {"a string coordinate", %{from: ["-121.4", 47.4], to: [-121.4, 47.4]}},
          {"a longitude out of range", %{from: [181, 47.4], to: [-121.4, 47.4]}},
          {"a latitude out of range", %{from: [-121.4, 47.4], to: [-121.4, -90.5]}}
        ] do
      test "answers 400 for #{name}", %{conn: conn} do
        assert %{"errors" => %{"detail" => _}} =
                 conn |> snap(unquote(Macro.escape(body))) |> json_response(400)
      end
    end
  end
end
