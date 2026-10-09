defmodule SteerWeb.FallbackController do
  @moduledoc """
  Turns an action's `{:error, changeset}` into a 422 with the changeset's
  errors, and `{:error, :elevation_unavailable}` (a leg needed Z and the DEM
  couldn't be read) into a 502. Missing records raise `Ecto.NoResultsError`, which Phoenix already
  answers with a 404.
  """

  use SteerWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: SteerWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # The same shape as SteerWeb.ErrorJSON's errors.
  def call(conn, {:error, :elevation_unavailable}) do
    conn
    |> put_status(:bad_gateway)
    |> json(%{errors: %{detail: "the DEM couldn't be read to fill in missing elevations"}})
  end
end
