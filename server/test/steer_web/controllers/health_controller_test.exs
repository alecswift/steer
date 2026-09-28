defmodule SteerWeb.HealthControllerTest do
  use SteerWeb.ConnCase, async: true

  test "GET /api/health reports ok", %{conn: conn} do
    conn = get(conn, ~p"/api/health")
    assert json_response(conn, 200) == %{"status" => "ok"}
  end
end
