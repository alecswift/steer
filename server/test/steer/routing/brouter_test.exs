defmodule Steer.Routing.BRouterTest do
  use ExUnit.Case, async: true

  alias Steer.Routing.BRouter

  @from [-121.4133, 47.42769]
  @to [-121.45167, 47.45762]

  # A BRouter GeoJSON track, cut down to what the adapter reads plus a few of
  # the properties BRouter sends with it.
  @track %{
    "type" => "FeatureCollection",
    "features" => [
      %{
        "type" => "Feature",
        "properties" => %{"creator" => "BRouter-1.7.10", "track-length" => "7466"},
        "geometry" => %{
          "type" => "LineString",
          "coordinates" => [
            [-121.41332, 47.427678, 938.5],
            [-121.4135, 47.4279, 941.25],
            [-121.451549, 47.457521, 1213.5]
          ]
        }
      }
    ]
  }

  defp stub(plug), do: Req.Test.stub(BRouter, plug)

  describe "snap/2" do
    test "asks BRouter for the leg with the hiking profile, and returns its line" do
      stub(fn conn ->
        assert conn.request_path == "/brouter"

        assert %{
                 "lonlats" => "-121.4133,47.42769|-121.45167,47.45762",
                 "profile" => "hiking-mountain",
                 "profile:path_preference" => "10",
                 "format" => "geojson"
               } = conn.query_params

        conn
        |> Plug.Conn.put_resp_content_type("application/vnd.geo+json")
        |> Plug.Conn.send_resp(200, Jason.encode!(@track))
      end)

      assert BRouter.snap(@from, @to) ==
               {:ok,
                [
                  [-121.41332, 47.427678, 938.5],
                  [-121.4135, 47.4279, 941.25],
                  [-121.451549, 47.457521, 1213.5]
                ]}
    end

    test "keeps vertices without elevation as [lon, lat]" do
      track =
        put_in(@track, ["features", Access.at(0), "geometry", "coordinates"], [
          [-121.41332, 47.427678],
          [-121.451549, 47.457521]
        ])

      stub(&Plug.Conn.send_resp(&1, 200, Jason.encode!(track)))

      assert BRouter.snap(@from, @to) ==
               {:ok, [[-121.41332, 47.427678], [-121.451549, 47.457521]]}
    end

    test "a point with no way near it is no route" do
      stub(&Plug.Conn.send_resp(&1, 400, "from-position not mapped in existing datafile"))

      assert BRouter.snap(@from, @to) == {:error, :no_route}
    end

    test "points with no path between them are no route" do
      stub(&Plug.Conn.send_resp(&1, 400, "no track found at pass=0"))

      assert BRouter.snap(@from, @to) == {:error, :no_route}
    end

    test "a timeout is :timeout, without retrying" do
      Req.Test.expect(BRouter, &Req.Test.transport_error(&1, :timeout))

      assert BRouter.snap(@from, @to) == {:error, :timeout}
      Req.Test.verify!(BRouter)
    end

    test "any other failure is passed on" do
      stub(&Plug.Conn.send_resp(&1, 500, ""))
      assert BRouter.snap(@from, @to) == {:error, {:http_error, 500, ""}}

      stub(&Plug.Conn.send_resp(&1, 400, "lonlats parameter not found"))

      assert BRouter.snap(@from, @to) ==
               {:error, {:http_error, 400, "lonlats parameter not found"}}

      stub(&Plug.Conn.send_resp(&1, 200, "not json"))
      assert BRouter.snap(@from, @to) == {:error, :invalid_response}

      stub(&Req.Test.transport_error(&1, :econnrefused))

      assert BRouter.snap(@from, @to) ==
               {:error, %Req.TransportError{reason: :econnrefused}}
    end
  end
end
