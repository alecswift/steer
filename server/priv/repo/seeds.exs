# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# It is safe to run more than once.

# The implicit default user that owns every route.
user = Steer.Accounts.default_user()

# Dev routes around Snoqualmie Pass, in the shape `POST /api/routes` takes.
# The lines follow OpenStreetMap trails (© OpenStreetMap contributors, ODbL),
# with elevations from AWS Terrain Tiles. Added only to a dev database with no
# routes, so running this again doesn't duplicate them.
if Mix.env() == :dev and Steer.Routes.list_routes(user) == [] do
  __DIR__
  |> Path.join("seed_routes.json")
  |> File.read!()
  |> Jason.decode!()
  |> Enum.each(fn params -> {:ok, _route} = Steer.Routes.create_route(user, params) end)
end
