defmodule Steer.ElevationTest do
  # Uses the shared tile cache (see Steer.Elevation.TilesTest).
  use ExUnit.Case, async: false

  alias Steer.Elevation.Tiles

  # The zoom 12 Terrarium tile with the summit of Snoqualmie Mountain in it
  # (x 666, y 1432).
  @tile File.read!("test/fixtures/terrarium_12_666_1432.png")

  # The centers of two pixels in that tile, in the same column 12 rows
  # apart: the summit (column 141, row 252) and a point 310 m north of it
  # (row 240). Their elevations were read from the tile with macOS's own
  # PNG decoder (`sips`).
  @summit [-121.41626358032227, 47.45862098585447]
  @summit_z 1907.484375
  @north [-121.41626358032227, 47.46140645090276]
  @north_z 1711.12109375

  setup do
    :ets.delete_all_objects(Tiles)
    :ok
  end

  defp serve_tile(conn), do: Plug.Conn.send_resp(conn, 200, @tile)

  describe "sample_line/1" do
    test "adds a point every 30 m or less, and gives each a Z from the DEM" do
      Req.Test.expect(Tiles, &serve_tile/1)

      assert {:ok, line} = Steer.Elevation.sample_line([@summit, @north])

      # 310 m in 11 even steps of 28 m, each point in the tile's column 141.
      assert length(line) == 12
      assert hd(line) == @summit ++ [@summit_z]
      assert List.last(line) == @north ++ [@north_z]

      [lon, _lat] = @summit
      step = (Enum.at(@north, 1) - Enum.at(@summit, 1)) / 11

      for {[point_lon, point_lat, z], i} <- Enum.with_index(line) do
        assert point_lon == lon
        assert_in_delta point_lat, Enum.at(@summit, 1) + i * step, 1.0e-9
        assert is_float(z)
      end
    end

    test "keeps the line's own points" do
      Req.Test.stub(Tiles, &serve_tile/1)
      middle = [-121.4160, 47.4600]

      assert {:ok, line} = Steer.Elevation.sample_line([@summit, middle, @north])
      assert Enum.any?(line, &match?([-121.4160, 47.4600, _z], &1))
    end

    test "fetches each tile a line crosses once" do
      # A line south from the summit into the tile below (y 1433). The
      # stub serves the same tile for both.
      Req.Test.expect(Tiles, 2, fn conn ->
        assert conn.request_path =~ ~r"/terrarium/12/666/143[23]\.png$"
        serve_tile(conn)
      end)

      assert {:ok, _line} = Steer.Elevation.sample_line([@summit, [-121.4163, 47.4500]])
      Req.Test.verify!(Tiles)
    end

    test "passes on a tile that can't be fetched" do
      Req.Test.stub(Tiles, &Plug.Conn.send_resp(&1, 503, ""))

      assert Steer.Elevation.sample_line([@summit, @north]) == {:error, {:http_error, 503}}
    end
  end
end
