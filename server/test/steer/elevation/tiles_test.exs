defmodule Steer.Elevation.TilesTest do
  # The tile cache is one shared table, so these tests can't run alongside
  # each other or the other elevation tests.
  use ExUnit.Case, async: false

  alias Steer.Elevation.Tiles

  # The zoom 12 Terrarium tile with the summit of Snoqualmie Mountain in it.
  @tile File.read!("test/fixtures/terrarium_12_666_1432.png")

  setup do
    :ets.delete_all_objects(Tiles)
    :ok
  end

  defp serve_tile(conn) do
    assert conn.request_path == "/elevation-tiles-prod/terrarium/12/666/1432.png"
    conn |> Plug.Conn.put_resp_content_type("image/png") |> Plug.Conn.send_resp(200, @tile)
  end

  describe "fetch/3 and elevation/3" do
    test "fetches and decodes a tile, and reads a pixel's elevation" do
      Req.Test.expect(Tiles, &serve_tile/1)

      assert {:ok, pixels} = Tiles.fetch(12, 666, 1432)
      # The tile's highest pixel, at the summit. The expected values were
      # read from the same tile with macOS's own PNG decoder (`sips`).
      assert Tiles.elevation(pixels, 141, 252) == 1907.484375
      assert Tiles.elevation(pixels, 140, 251) == 1903.42578125
    end

    test "fetches each tile once" do
      Req.Test.expect(Tiles, &serve_tile/1)

      assert {:ok, pixels} = Tiles.fetch(12, 666, 1432)
      assert {:ok, ^pixels} = Tiles.fetch(12, 666, 1432)
      Req.Test.verify!(Tiles)
    end

    test "passes on a failed fetch, and doesn't cache it" do
      Req.Test.expect(Tiles, &Plug.Conn.send_resp(&1, 403, ""))
      assert Tiles.fetch(12, 666, 1432) == {:error, {:http_error, 403}}

      Req.Test.expect(Tiles, &Plug.Conn.send_resp(&1, 200, "not a png"))
      assert Tiles.fetch(12, 666, 1432) == {:error, :invalid_tile}

      Req.Test.expect(Tiles, &Req.Test.transport_error(&1, :timeout))
      assert Tiles.fetch(12, 666, 1432) == {:error, %Req.TransportError{reason: :timeout}}
    end
  end
end
