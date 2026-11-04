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
                 "profile" => "steer-hiking",
                 "profile:path_preference" => "10",
                 "format" => "geojson"
               } = conn.query_params

        conn
        |> Plug.Conn.put_resp_content_type("application/vnd.geo+json")
        |> Plug.Conn.send_resp(200, Jason.encode!(@track))
      end)

      assert BRouter.snap(@from, @to) ==
               {:ok,
                %{
                  line: [
                    [-121.41332, 47.427678, 938.5],
                    [-121.4135, 47.4279, 941.25],
                    [-121.451549, 47.457521, 1213.5]
                  ],
                  foot_no: []
                }}
    end

    test "keeps vertices without elevation as [lon, lat]" do
      track =
        put_in(@track, ["features", Access.at(0), "geometry", "coordinates"], [
          [-121.41332, 47.427678],
          [-121.451549, 47.457521]
        ])

      stub(&Plug.Conn.send_resp(&1, 200, Jason.encode!(track)))

      assert BRouter.snap(@from, @to) ==
               {:ok, %{line: [[-121.41332, 47.427678], [-121.451549, 47.457521]], foot_no: []}}
    end

    test "gives the stretches on ways tagged foot=no as vertex ranges, joining touching ones" do
      # Each message row ends a stretch at one of the line's vertices, in
      # millionths of a degree, with that stretch's tags. The first row is
      # the start.
      line = for i <- 0..6, do: [-121.4 + i / 1000, 47.4 + i / 1000, 900.0 + i]
      ends = [{0, "highway=path"}, {2, "highway=path"}, {3, "highway=path foot=no bicycle=no"}]
      ends = ends ++ [{4, "reversedirection=yes highway=path foot=no"}, {6, "highway=track"}]

      messages = [
        ["Longitude", "Latitude", "Elevation", "Distance", "WayTags"]
        | for {i, tags} <- ends do
            [lon, lat, _z] = Enum.at(line, i)

            [
              to_string(round(lon * 1_000_000)),
              to_string(round(lat * 1_000_000)),
              "900",
              "1",
              tags
            ]
          end
      ]

      track =
        @track
        |> put_in(["features", Access.at(0), "geometry", "coordinates"], line)
        |> put_in(["features", Access.at(0), "properties", "messages"], messages)

      stub(&Plug.Conn.send_resp(&1, 200, Jason.encode!(track)))

      assert BRouter.snap(@from, @to) == {:ok, %{line: line, foot_no: [[2, 4]]}}
    end

    test "a leg that starts on a foot=no way is marked from its first vertex" do
      line = [[-121.4, 47.4], [-121.401, 47.401], [-121.402, 47.402]]

      messages = [
        ["Longitude", "Latitude", "WayTags"],
        ["-121400000", "47400000", "highway=path foot=no"],
        ["-121401000", "47401000", "highway=path foot=no"],
        ["-121402000", "47402000", "highway=path foot=yes"]
      ]

      track =
        @track
        |> put_in(["features", Access.at(0), "geometry", "coordinates"], line)
        |> put_in(["features", Access.at(0), "properties", "messages"], messages)

      stub(&Plug.Conn.send_resp(&1, 200, Jason.encode!(track)))

      assert BRouter.snap(@from, @to) == {:ok, %{line: line, foot_no: [[0, 1]]}}
    end

    test "messages it can't read mark nothing, and never lose the leg" do
      line = [[-121.4, 47.4], [-121.401, 47.401]]

      for messages <- [
            nil,
            [],
            [["Longitude", "Latitude"]],
            [["Longitude", "Latitude", "WayTags"], ["x", "47401000", "foot=no"]],
            [["Longitude", "Latitude", "WayTags"], ["-121999000", "47999000", "foot=no"]]
          ] do
        track =
          @track
          |> put_in(["features", Access.at(0), "geometry", "coordinates"], line)
          |> put_in(["features", Access.at(0), "properties", "messages"], messages)

        stub(&Plug.Conn.send_resp(&1, 200, Jason.encode!(track)))

        assert BRouter.snap(@from, @to) == {:ok, %{line: line, foot_no: []}}
      end
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
