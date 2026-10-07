defmodule Steer.Elevation do
  @zoom 12
  @spacing_m 30

  @moduledoc """
  Elevation from the Terrarium DEM tiles (see `Steer.Elevation.Tiles`), for
  legs that BRouter doesn't give Z values: straight fallback legs, and the
  points of a snapped leg where BRouter has no elevation data.

  Tiles are read at zoom #{@zoom}, where a pixel is about 38 m across at the
  equator and 26 m at Snoqualmie Pass, about the spacing of the points a
  line is sampled at (#{@spacing_m} m). Each point takes its pixel's value.
  """

  alias Steer.Elevation.Tiles

  # Web Mercator's limit: tiles cover latitudes up to about ±85.05°.
  @max_lat 85.0511287798
  @earth_radius_m 6_371_008.8
  @world_px 256 * 2 ** @zoom

  @doc """
  Adds points every #{@spacing_m} m or less along a line of `[lon, lat]`
  points, and gives every point a Z from the DEM. Returns
  `{:ok, [[lon, lat, z]]}`, with the line's own points kept, or
  `{:error, reason}` when a tile can't be fetched.
  """
  def sample_line([_, _ | _] = line), do: line |> densify() |> fill_z()

  @doc """
  Gives each `[lon, lat]` point a Z from the DEM; `[lon, lat, z]` points keep
  theirs. Returns `{:ok, [[lon, lat, z]]}`, or `{:error, reason}` when a tile
  can't be fetched.
  """
  def fill_z(points) do
    pixels = for [_lon, _lat] = point <- points, do: world_pixel(point)

    with {:ok, tiles} <- fetch_tiles(pixels) do
      {:ok,
       Enum.map(points, fn
         [lon, lat] = point -> [lon, lat, elevation(tiles, world_pixel(point))]
         point -> point
       end)}
    end
  end

  defp densify([first | rest]) do
    {points, _last} =
      Enum.flat_map_reduce(rest, first, fn point, previous ->
        n = max(ceil(distance_m(previous, point) / @spacing_m), 1)
        {for(i <- 1..(n - 1)//1, do: interpolate(previous, point, i / n)) ++ [point], point}
      end)

    [first | points]
  end

  defp interpolate([lon1, lat1], [lon2, lat2], t),
    do: [lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t]

  # Haversine distance.
  defp distance_m([lon1, lat1], [lon2, lat2]) do
    {phi1, phi2} = {radians(lat1), radians(lat2)}

    h =
      :math.sin((phi2 - phi1) / 2) ** 2 +
        :math.cos(phi1) * :math.cos(phi2) * :math.sin(radians(lon2 - lon1) / 2) ** 2

    2 * @earth_radius_m * :math.asin(:math.sqrt(h))
  end

  # Fetches each tile the pixels fall in once, as a map from `{x, y}`.
  defp fetch_tiles(pixels) do
    pixels
    |> Enum.map(&tile/1)
    |> Enum.uniq()
    # Concurrently: a cold tile takes about half a second to download.
    |> Task.async_stream(fn {x, y} = tile -> {tile, Tiles.fetch(@zoom, x, y)} end,
      timeout: :infinity
    )
    |> Enum.reduce_while({:ok, %{}}, fn
      {:ok, {tile, {:ok, data}}}, {:ok, tiles} -> {:cont, {:ok, Map.put(tiles, tile, data)}}
      {:ok, {_tile, {:error, reason}}}, _acc -> {:halt, {:error, reason}}
    end)
  end

  defp elevation(tiles, {x, y} = pixel),
    do: Tiles.elevation(Map.fetch!(tiles, tile(pixel)), rem(x, 256), rem(y, 256))

  defp tile({x, y}), do: {div(x, 256), div(y, 256)}

  # The Web Mercator pixel at the DEM zoom that a point falls in, counted
  # from the top left of the world.
  defp world_pixel([lon, lat]) do
    lat = lat |> min(@max_lat) |> max(-@max_lat) |> radians()
    x = (lon + 180) / 360 * @world_px
    y = (1 - :math.log(:math.tan(lat) + 1 / :math.cos(lat)) / :math.pi()) / 2 * @world_px
    {clamp_px(x), clamp_px(y)}
  end

  defp clamp_px(px), do: px |> floor() |> max(0) |> min(@world_px - 1)

  defp radians(degrees), do: degrees * :math.pi() / 180
end
