defmodule Steer.Elevation.PNG do
  @moduledoc """
  A minimal PNG decoder for Terrarium elevation tiles, which are always 8-bit
  RGB and not interlaced. Anything else is rejected rather than misread.

  Chosen in chunk 6.5 over an image library: the format is this narrow, and
  Erlang's `:zlib` does the decompression, so there's no native dependency.
  """

  import Bitwise

  @signature <<137, "PNG", 13, 10, 26, 10>>
  # Bytes per pixel: R, G and B.
  @bpp 3

  @doc """
  Decodes a PNG into `{:ok, {width, height, pixels}}`, where `pixels` is the
  rows top to bottom as one binary of R, G, B bytes. Returns
  `{:error, :invalid_png}` for anything that isn't an 8-bit RGB,
  non-interlaced PNG.
  """
  def decode(<<@signature, chunks::binary>>) do
    with {:ok, {width, height}, idat} <- read_chunks(chunks, nil, []),
         {:ok, data} <- inflate(idat),
         stride = width * @bpp,
         true <- byte_size(data) == height * (stride + 1),
         {:ok, pixels} <- unfilter(stride, data, :binary.copy(<<0>>, stride), []) do
      {:ok, {width, height, pixels}}
    else
      _ -> {:error, :invalid_png}
    end
  end

  def decode(_data), do: {:error, :invalid_png}

  # Walks the chunks, keeping the size from IHDR and the IDAT data (which
  # may be split across several chunks), until IEND.
  defp read_chunks(
         <<length::32, type::binary-4, data::binary-size(length), _crc::32, rest::binary>>,
         size,
         idat
       ) do
    case {type, data} do
      # Bit depth 8, color type 2 (RGB), compression 0, filter 0, no interlace.
      {"IHDR", <<width::32, height::32, 8, 2, 0, 0, 0>>} ->
        read_chunks(rest, {width, height}, idat)

      {"IHDR", _data} ->
        :error

      {"IDAT", data} ->
        read_chunks(rest, size, [idat, data])

      {"IEND", _data} when size != nil ->
        {:ok, size, idat}

      _ancillary ->
        read_chunks(rest, size, idat)
    end
  end

  defp read_chunks(_chunks, _size, _idat), do: :error

  defp inflate(idat) do
    {:ok, :zlib.uncompress(idat)}
  rescue
    ErlangError -> :error
  end

  # Each row starts with a filter type byte. Undoing the filter needs the
  # row above (`prev`), already unfiltered.
  defp unfilter(_stride, <<>>, _prev, rows), do: {:ok, IO.iodata_to_binary(Enum.reverse(rows))}

  defp unfilter(stride, data, prev, rows) do
    case data do
      <<filter, row::binary-size(^stride), rest::binary>> when filter <= 4 ->
        row = unfilter_row(filter, row, prev, {0, 0, 0}, {0, 0, 0}, [])
        unfilter(stride, rest, row, [row | rows])

      _invalid ->
        :error
    end
  end

  # One pixel at a time: `a` is the unfiltered pixel to the left, `b` the
  # one above, and `c` the one above and to the left (zeros at the edges).
  defp unfilter_row(_filter, <<>>, <<>>, _a, _c, acc), do: IO.iodata_to_binary(acc)

  defp unfilter_row(filter, <<x1, x2, x3, xs::binary>>, <<b1, b2, b3, bs::binary>>, a, c, acc) do
    {a1, a2, a3} = a
    {c1, c2, c3} = c
    r1 = recon(filter, x1, a1, b1, c1)
    r2 = recon(filter, x2, a2, b2, c2)
    r3 = recon(filter, x3, a3, b3, c3)
    unfilter_row(filter, xs, bs, {r1, r2, r3}, {b1, b2, b3}, [acc, r1, r2, r3])
  end

  # The five PNG filter types: None, Sub, Up, Average and Paeth.
  defp recon(0, x, _a, _b, _c), do: x
  defp recon(1, x, a, _b, _c), do: x + a &&& 0xFF
  defp recon(2, x, _a, b, _c), do: x + b &&& 0xFF
  defp recon(3, x, a, b, _c), do: x + div(a + b, 2) &&& 0xFF
  defp recon(4, x, a, b, c), do: x + paeth(a, b, c) &&& 0xFF

  defp paeth(a, b, c) do
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)

    cond do
      pa <= pb and pa <= pc -> a
      pb <= pc -> b
      true -> c
    end
  end
end
