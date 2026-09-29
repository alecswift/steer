defmodule SteerWeb.RouteController do
  use SteerWeb, :controller

  alias Steer.{Accounts, Routes}

  action_fallback SteerWeb.FallbackController

  # Every action works within the implicit default user's routes.
  def action(conn, _options) do
    apply(__MODULE__, action_name(conn), [conn, conn.params, Accounts.default_user()])
  end

  @doc """
  Lists the user's routes as a GeoJSON FeatureCollection, newest first.
  """
  def index(conn, _params, user) do
    render(conn, :index, routes: Routes.list_routes(user))
  end

  @doc """
  Returns one route as a GeoJSON Feature.
  """
  def show(conn, %{"id" => id}, user) do
    render(conn, :show, route: Routes.get_route!(user, id))
  end

  @doc """
  Creates a route from `name` (optional), `waypoints` and `legs` (see
  `Steer.Routes.build/1`), and returns it as a GeoJSON Feature.
  """
  def create(conn, params, user) do
    with {:ok, route} <- Routes.create_route(user, params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/routes/#{route}")
      |> render(:show, route: route)
    end
  end

  @doc """
  Replaces a route from the same fields as `create/3`.
  """
  def update(conn, %{"id" => id} = params, user) do
    route = Routes.get_route!(user, id)

    with {:ok, route} <- Routes.update_route(route, params) do
      render(conn, :show, route: route)
    end
  end

  @doc """
  Deletes a route.
  """
  def delete(conn, %{"id" => id}, user) do
    route = Routes.get_route!(user, id)

    with {:ok, _route} <- Routes.delete_route(route) do
      send_resp(conn, :no_content, "")
    end
  end
end
