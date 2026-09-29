# Postgrex types for Steer.Repo: Ecto's defaults plus PostGIS geometries,
# which decode to and encode from `Geo` structs.
Postgrex.Types.define(
  Steer.PostgresTypes,
  [Geo.PostGIS.Extension] ++ Ecto.Adapters.Postgres.extensions(),
  json: Jason
)
