defmodule Steer.Elevation.Tiles do
  @max_tiles 256

  @moduledoc """
  Terrarium elevation tiles from AWS (the same tiles the map's hillshade and
  contours use), fetched and decoded on first use and cached in memory.

  Terrarium packs each pixel's elevation in meters into its color:
  `(R * 256 + G + B / 256) - 32768`.

  The cache is an ETS table owned by this process. It holds up to
  #{@max_tiles} tiles (about 50 MB); when it's full, one tile is dropped for each new
  one. Each lookup counts toward `steer.dem.tile_cache`, by `result` (`hit` /
  `miss`).
  """

  use GenServer

  alias Steer.Elevation.PNG
  alias Steer.Telemetry.Metrics

  @url "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"
  @size 256

  def start_link(_opts), do: GenServer.start_link(__MODULE__, nil, name: __MODULE__)

  @impl true
  def init(nil) do
    :ets.new(__MODULE__, [:named_table, :public, read_concurrency: true])
    {:ok, nil}
  end

  @doc """
  Returns the decoded tile at `zoom`/`x`/`y`: its pixels as one binary of R,
  G, B bytes, rows top to bottom. Fetches it on a cache miss, in the
  caller's process.
  """
  def fetch(zoom, x, y) do
    key = {zoom, x, y}

    case :ets.lookup(__MODULE__, key) do
      [{^key, pixels}] ->
        Metrics.count(:"steer.dem.tile_cache", %{result: :hit})
        {:ok, pixels}

      [] ->
        Metrics.count(:"steer.dem.tile_cache", %{result: :miss})

        with {:ok, pixels} <- download(zoom, x, y) do
          if :ets.info(__MODULE__, :size) >= @max_tiles,
            do: :ets.delete(__MODULE__, :ets.first(__MODULE__))

          :ets.insert(__MODULE__, {key, pixels})
          {:ok, pixels}
        end
    end
  end

  @doc """
  Returns the elevation in meters of the pixel at column `px`, row `py` of a
  tile from `fetch/3`.
  """
  def elevation(pixels, px, py) do
    <<r, g, b>> = binary_part(pixels, (py * @size + px) * 3, 3)
    r * 256 + g + b / 256 - 32768
  end

  defp download(zoom, x, y) do
    [
      url: "#{@url}/#{zoom}/#{x}/#{y}.png",
      # A retry would make the leg late; the caller reports the error instead.
      retry: false,
      receive_timeout: 2_000
    ]
    |> Keyword.merge(Application.get_env(:steer, __MODULE__, []))
    |> Req.get()
    |> case do
      {:ok, %Req.Response{status: 200, body: body}} ->
        case PNG.decode(body) do
          {:ok, {@size, @size, pixels}} -> {:ok, pixels}
          _ -> {:error, :invalid_tile}
        end

      {:ok, %Req.Response{status: status}} ->
        {:error, {:http_error, status}}

      {:error, exception} ->
        {:error, exception}
    end
  end
end
