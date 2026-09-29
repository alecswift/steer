defmodule SteerWeb.RouteControllerTest do
  use SteerWeb.ConnCase, async: true

  alias Steer.{Accounts, Repo, Routes}
  alias Steer.Accounts.User

  @params %{
    "name" => "Snow Lake",
    "waypoints" => [%{"lon" => 0.0, "lat" => 0.0}, %{"lon" => 0.01, "lat" => 0.0}],
    "legs" => [
      %{"coordinates" => [[0.0, 0.0, 100], [0.01, 0.0, 150]], "snapped" => true}
    ]
  }

  defp create_route!(params \\ @params) do
    {:ok, route} = Routes.create_route(Accounts.default_user(), params)
    route
  end

  describe "GET /api/routes" do
    test "lists the routes as a GeoJSON FeatureCollection", %{conn: conn} do
      route = create_route!()

      assert %{"type" => "FeatureCollection", "features" => [feature]} =
               conn |> get(~p"/api/routes") |> json_response(200)

      assert %{
               "type" => "Feature",
               "id" => id,
               "geometry" => %{
                 "type" => "LineString",
                 "coordinates" => [[0.0, 0.0, 100.0], [0.01, 0.0, 150.0]]
               },
               "properties" => %{
                 "name" => "Snow Lake",
                 "gain_m" => 50.0,
                 "loss_m" => +0.0,
                 "min_ele_m" => 100.0,
                 "max_ele_m" => 150.0,
                 "waypoints" => [
                   %{"lon" => 0.0, "lat" => 0.0, "geometry_index" => 0},
                   %{"lon" => 0.01, "lat" => 0.0, "geometry_index" => 1}
                 ]
               }
             } = feature

      assert id == route.id
      assert_in_delta feature["properties"]["distance_m"], 1113.195, 0.001
    end

    test "lists only the default user's routes", %{conn: conn} do
      {:ok, _route} = Routes.create_route(Repo.insert!(%User{}), @params)

      assert %{"features" => []} = conn |> get(~p"/api/routes") |> json_response(200)
    end
  end

  describe "GET /api/routes/:id" do
    test "returns the route as a Feature", %{conn: conn} do
      route = create_route!()

      assert %{"type" => "Feature", "id" => id} =
               conn |> get(~p"/api/routes/#{route}") |> json_response(200)

      assert id == route.id
    end

    test "is a 404 for a route that doesn't exist", %{conn: conn} do
      assert_error_sent 404, fn -> get(conn, ~p"/api/routes/#{Ecto.UUID.generate()}") end
    end
  end

  describe "POST /api/routes" do
    test "creates a route and returns it", %{conn: conn} do
      conn = post(conn, ~p"/api/routes", @params)

      assert %{"id" => id, "properties" => %{"name" => "Snow Lake"}} = json_response(conn, 201)
      assert get_resp_header(conn, "location") == ["/api/routes/#{id}"]
      assert Routes.get_route!(Accounts.default_user(), id)
    end

    test "generates a name when none is given", %{conn: conn} do
      conn = post(conn, ~p"/api/routes", Map.delete(@params, "name"))

      assert %{"properties" => %{"name" => "0.7 mi route · " <> _date}} =
               json_response(conn, 201)
    end

    test "is a 422 with the errors for an invalid route", %{conn: conn} do
      conn = post(conn, ~p"/api/routes", Map.put(@params, "legs", []))

      assert json_response(conn, 422) == %{
               "errors" => %{
                 "legs" => ["must have one leg between each pair of consecutive waypoints"]
               }
             }
    end
  end

  describe "PUT /api/routes/:id" do
    test "replaces the route", %{conn: conn} do
      route = create_route!()

      conn = put(conn, ~p"/api/routes/#{route}", Map.put(@params, "name", "Snow Lake again"))

      assert %{"properties" => %{"name" => "Snow Lake again"}} = json_response(conn, 200)
    end

    test "is a 422 with the errors for an invalid route", %{conn: conn} do
      route = create_route!()

      conn = put(conn, ~p"/api/routes/#{route}", Map.delete(@params, "waypoints"))

      assert %{"errors" => %{"waypoints" => [_]}} = json_response(conn, 422)
    end

    test "is a 404 for another user's route", %{conn: conn} do
      {:ok, route} = Routes.create_route(Repo.insert!(%User{}), @params)

      assert_error_sent 404, fn -> put(conn, ~p"/api/routes/#{route}", @params) end
    end
  end

  describe "DELETE /api/routes/:id" do
    test "deletes the route", %{conn: conn} do
      route = create_route!()

      assert conn |> delete(~p"/api/routes/#{route}") |> response(204)
      assert Routes.list_routes(Accounts.default_user()) == []
    end

    test "is a 404 for a route that doesn't exist", %{conn: conn} do
      assert_error_sent 404, fn -> delete(conn, ~p"/api/routes/#{Ecto.UUID.generate()}") end
    end
  end
end
