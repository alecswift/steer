defmodule Steer.Routes.Name do
  @moduledoc """
  Names for routes saved without one, from their stats and the date, e.g.
  `5.2 mi loop · Sep 24` or `3.1 mi route · Sep 24`. A route is a loop when
  its first and last waypoints are the same point. When the user already has
  a route with that name, ` (2)`, ` (3)`, … is added.
  """

  import Ecto.Query

  alias Steer.Repo
  alias Steer.Routes.Route

  @meters_per_mile 1609.344

  @doc """
  Generates a name for a route owned by `user_id`, from the attributes
  `Steer.Routes.build/1` returns and the date it's saved. `except_id` is the
  route being renamed, whose own name doesn't count as taken.
  """
  def generate(user_id, %{distance_m: distance_m, waypoints: waypoints}, date, except_id \\ nil) do
    miles = :erlang.float_to_binary(distance_m / @meters_per_mile, decimals: 1)
    kind = if loop?(waypoints), do: "loop", else: "route"
    base = "#{miles} mi #{kind} · #{Calendar.strftime(date, "%b %-d")}"

    taken = MapSet.new(names_like(user_id, base, except_id))

    Stream.iterate(1, &(&1 + 1))
    |> Stream.map(fn
      1 -> base
      n -> "#{base} (#{n})"
    end)
    |> Enum.find(&(not MapSet.member?(taken, &1)))
  end

  defp loop?(waypoints) do
    first = List.first(waypoints)
    last = List.last(waypoints)
    {first["lon"], first["lat"]} == {last["lon"], last["lat"]}
  end

  # The base has no `%` or `_`, so it needs no escaping in a LIKE pattern.
  defp names_like(user_id, base, except_id) do
    query =
      from r in Route,
        where: r.user_id == ^user_id and like(r.name, ^"#{base}%"),
        select: r.name

    query = if except_id, do: where(query, [r], r.id != ^except_id), else: query
    Repo.all(query)
  end
end
