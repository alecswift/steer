defmodule Steer.Elevation.PNGTest do
  use ExUnit.Case, async: true

  alias Steer.Elevation.PNG

  # Builds a PNG from its header fields and raw scanlines (each a filter
  # type byte followed by the filtered row).
  defp png(width, height, scanlines, opts \\ []) do
    bit_depth = Keyword.get(opts, :bit_depth, 8)
    color_type = Keyword.get(opts, :color_type, 2)
    interlace = Keyword.get(opts, :interlace, 0)
    data = :zlib.compress(scanlines)
    # Split the data across two IDAT chunks, as encoders do with big images.
    half = div(byte_size(data), 2)

    <<137, "PNG", 13, 10, 26, 10>> <>
      chunk("IHDR", <<width::32, height::32, bit_depth, color_type, 0, 0, interlace>>) <>
      chunk("tEXt", "Software\0test") <>
      chunk("IDAT", binary_part(data, 0, half)) <>
      chunk("IDAT", binary_part(data, half, byte_size(data) - half)) <>
      chunk("IEND", "")
  end

  defp chunk(type, data),
    do: <<byte_size(data)::32, type::binary, data::binary, :erlang.crc32(type <> data)::32>>

  # A 2×2 image: the first row is stored unfiltered, and the second row with
  # each filter type in turn. Every filtered second row below decodes to
  # the same pixels.
  @pixels <<10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120>>
  @first_row <<0, 10, 20, 30, 40, 50, 60>>

  describe "decode/1" do
    for {name, second_row} <- [
          none: <<0, 70, 80, 90, 100, 110, 120>>,
          # Minus the pixel to the left.
          sub: <<1, 70, 80, 90, 30, 30, 30>>,
          # Minus the pixel above.
          up: <<2, 60, 60, 60, 60, 60, 60>>,
          # Minus the average of left and above, rounded down.
          average: <<3, 65, 70, 75, 45, 45, 45>>,
          # Minus whichever of left, above and above-left is closest to
          # left + above - above-left: above for the first pixel, left for the second.
          paeth: <<4, 60, 60, 60, 30, 30, 30>>
        ] do
      test "undoes the #{name} filter" do
        assert PNG.decode(png(2, 2, @first_row <> unquote(second_row))) ==
                 {:ok, {2, 2, @pixels}}
      end
    end

    test "wraps around at 256" do
      # Sub: 66 + 200 = 266 → 10, and 2 + 255 = 257 → 1.
      assert PNG.decode(png(2, 1, <<1, 200, 0, 255, 66, 5, 2>>)) ==
               {:ok, {2, 1, <<200, 0, 255, 10, 5, 1>>}}
    end

    test "rejects other formats" do
      scanlines = @first_row <> @first_row

      for opts <- [[bit_depth: 16], [color_type: 6], [interlace: 1]] do
        assert PNG.decode(png(2, 2, scanlines, opts)) == {:error, :invalid_png}
      end
    end

    test "rejects broken data" do
      assert PNG.decode("not a png") == {:error, :invalid_png}
      # One row missing.
      assert PNG.decode(png(2, 2, @first_row)) == {:error, :invalid_png}
      # An unknown filter type.
      assert PNG.decode(png(2, 1, <<5, 0, 0, 0, 0, 0, 0>>)) == {:error, :invalid_png}

      truncated = png(2, 2, @first_row <> @first_row)
      assert PNG.decode(binary_part(truncated, 0, 60)) == {:error, :invalid_png}
    end
  end
end
