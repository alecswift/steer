defmodule Steer.Routes do
  @moduledoc """
  Routes: assembling a route from the editor's legs, and storing it. Every
  route belongs to a user, and each function here works within one user's
  routes.
  """

  import Ecto.Query

  require OpenTelemetry.Tracer, as: Tracer

  alias Steer.Accounts.User
  alias Steer.{Elevation, Repo, Routing}
  alias Steer.Routes.{Name, Route, Stats}

  @doc """
  Returns the user's routes, newest first.
  """
  def list_routes(%User{id: user_id}) do
    Repo.all(
      from r in Route,
        where: r.user_id == ^user_id,
        order_by: [desc: r.inserted_at, asc: r.name]
    )
  end

  @doc """
  Returns the user's route with this ID. Raises `Ecto.NoResultsError` when it
  doesn't exist or belongs to another user.
  """
  def get_route!(%User{id: user_id}, id), do: Repo.get_by!(Route, id: id, user_id: user_id)

  @doc """
  Creates a route for the user from `params` with string keys: `"waypoints"`
  and `"legs"` as `build/1` takes them, and an optional `"name"`. A blank name
  gets a generated one (see `Steer.Routes.Name`).
  """
  def create_route(%User{id: user_id}, params) do
    with {:ok, attrs} <- build(params) do
      %Route{user_id: user_id}
      |> Route.changeset(Map.put(attrs, :name, name(params, user_id, attrs, nil)))
      |> Repo.insert()
    end
  end

  @doc """
  Replaces a route's waypoints, line, stats and name from `params`, as in
  `create_route/2`. Fetch the route with `get_route!/2` first, so it's scoped
  to the user.
  """
  def update_route(%Route{} = route, params) do
    with {:ok, attrs} <- build(params) do
      route
      |> Route.changeset(Map.put(attrs, :name, name(params, route.user_id, attrs, route.id)))
      |> Repo.update()
    end
  end

  @doc """
  Deletes a route fetched with `get_route!/2`.
  """
  def delete_route(%Route{} = route), do: Repo.delete(route)

  # The given name, trimmed, or a generated one when it's blank. Anything that
  # isn't a string is passed on for the changeset to reject.
  defp name(params, user_id, attrs, except_id) do
    name = params["name"]
    name = if is_binary(name), do: String.trim(name), else: name

    if name in [nil, ""],
      do: Name.generate(user_id, attrs, Date.utc_today(), except_id),
      else: name
  end

  @doc """
  Assembles a route's attributes from the editor's waypoints and legs, both
  with string keys as they arrive in JSON:

    * `"waypoints"`: the clicked points in order, `[%{"lon", "lat"}]`.
    * `"legs"`: one leg between each pair of consecutive waypoints,
      `[%{"coordinates" => [[lon, lat, z]], "snapped" => boolean}]`.
      Coordinates may leave out Z, as in a leg the editor fell back to when
      it couldn't reach `/api/snap`; those get Z from the DEM first (see
      `fill_missing_z/1`).

  Joins the legs into one `Geo.LineStringZ`, dropping the repeated vertex
  where one leg ends and the next begins. Each waypoint gets the
  `geometry_index` of the vertex where it lands: the first vertex for the
  first waypoint, and the end of the leg that reaches it for the rest.

  Returns `{:ok, attrs}` with `:waypoints`, `:geometry` and the stats, ready
  for `Route.changeset/2` (the waypoints themselves are validated there),
  `{:error, changeset}` when the waypoints and legs don't fit together, or
  `{:error, :elevation_unavailable}` when a leg needs Z and the DEM can't be
  read.
  """
  def build(params) do
    waypoints = params["waypoints"]
    legs = params["legs"]

    cond do
      not (is_list(waypoints) and length(waypoints) >= 2 and Enum.all?(waypoints, &is_map/1)) ->
        build_error(:waypoints, "must be a list of at least 2 waypoints")

      not (is_list(legs) and length(legs) == length(waypoints) - 1) ->
        build_error(:legs, "must have one leg between each pair of consecutive waypoints")

      not Enum.all?(legs, &valid_leg?/1) ->
        build_error(
          :legs,
          "must each have a boolean snapped and at least 2 [lon, lat, z] or [lon, lat] coordinates in range"
        )

      true ->
        with {:ok, legs} <- fill_missing_z(legs), do: {:ok, assemble(waypoints, legs)}
    end
  end

  # Gives Z from the DEM to the legs that are missing some, before the stats
  # are computed. A leg with no Z at all is a straight line the editor fell
  # back to, so it's sampled along its length as Phoenix samples its own
  # straight legs (see `Steer.Routing.snap_or_straight/2`), unless it's
  # longer than a leg Phoenix would sample. Otherwise only the points
  # without Z get it.
  defp fill_missing_z(legs) do
    Enum.reduce_while(Enum.reverse(legs), {:ok, []}, fn leg, {:ok, filled} ->
      case leg_with_z(leg["coordinates"]) do
        {:ok, coordinates} -> {:cont, {:ok, [%{leg | "coordinates" => coordinates} | filled]}}
        {:error, _reason} -> {:halt, {:error, :elevation_unavailable}}
      end
    end)
  end

  defp leg_with_z(coordinates) do
    cond do
      Enum.all?(coordinates, &match?([_, _, _], &1)) ->
        {:ok, coordinates}

      Enum.all?(coordinates, &match?([_, _], &1)) and short?(coordinates) ->
        Elevation.sample_line(coordinates)

      true ->
        Elevation.fill_z(coordinates)
    end
  end

  defp short?(coordinates) do
    coordinates
    |> Enum.chunk_every(2, 1, :discard)
    |> Enum.map(fn [from, to] -> Elevation.distance_m(from, to) end)
    |> Enum.sum()
    |> Kernel.<=(Routing.max_leg_m())
  end

  defp assemble(waypoints, legs) do
    Tracer.with_span "steer.routes.build" do
      {coordinates, indexes} = join(Enum.map(legs, &leg_coordinates/1))
      line = %Geo.LineStringZ{coordinates: coordinates, srid: 4326}
      stats = Stats.compute(line)

      Tracer.set_attributes(%{
        leg_count: length(legs),
        straight_leg_count: Enum.count(legs, &(not &1["snapped"])),
        point_count: length(coordinates),
        distance_m: stats.distance_m
      })

      waypoints =
        Enum.zip_with(waypoints, indexes, &Map.put(&1, "geometry_index", &2))

      Map.merge(stats, %{waypoints: waypoints, geometry: line})
    end
  end

  # Joins the legs into one list of vertices, and returns it with the index
  # of each waypoint's vertex. Built in reverse, so both lists are prepended.
  defp join([first | rest]) do
    Enum.reduce(rest, {Enum.reverse(first), [length(first) - 1, 0]}, fn leg, {line, indexes} ->
      # A leg starts where the last one ended, unless one end is a straight
      # fallback from the clicked point rather than the snapped one.
      leg = if hd(leg) == hd(line), do: tl(leg), else: leg
      {Enum.reverse(leg, line), [hd(indexes) + length(leg) | indexes]}
    end)
    |> then(fn {line, indexes} -> {Enum.reverse(line), Enum.reverse(indexes)} end)
  end

  # `/ 1` makes every number a float, so a route reads back from PostGIS
  # exactly as it was built.
  defp leg_coordinates(%{"coordinates" => coordinates}),
    do: Enum.map(coordinates, fn [lon, lat, z] -> {lon / 1, lat / 1, z / 1} end)

  defp valid_leg?(%{"coordinates" => [_, _ | _] = coordinates, "snapped" => snapped})
       when is_boolean(snapped),
       do: Enum.all?(coordinates, &valid_coordinate?/1)

  defp valid_leg?(_leg), do: false

  defp valid_coordinate?([lon, lat, z]) when is_number(z), do: valid_coordinate?([lon, lat])

  defp valid_coordinate?([lon, lat])
       when is_number(lon) and lon >= -180 and lon <= 180 and
              is_number(lat) and lat >= -90 and lat <= 90,
       do: true

  defp valid_coordinate?(_coordinate), do: false

  defp build_error(field, message) do
    {:error, %Route{} |> Ecto.Changeset.change() |> Ecto.Changeset.add_error(field, message)}
  end
end
