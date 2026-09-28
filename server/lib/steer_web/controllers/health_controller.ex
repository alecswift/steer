defmodule SteerWeb.HealthController do
  use SteerWeb, :controller

  @doc """
  Reports whether the API is up and can reach the database.

  The `SELECT 1` also puts a database span in every health check's trace,
  so one request shows the whole browser → Phoenix → Postgres path.
  """
  def show(conn, _params) do
    case Ecto.Adapters.SQL.query(Steer.Repo, "SELECT 1", []) do
      {:ok, _result} ->
        json(conn, %{status: "ok"})

      {:error, _reason} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{status: "error"})
    end
  end
end
