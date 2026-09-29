defmodule SteerWeb.FallbackController do
  @moduledoc """
  Turns an action's `{:error, changeset}` into a 422 with the changeset's
  errors. Missing records raise `Ecto.NoResultsError`, which Phoenix already
  answers with a 404.
  """

  use SteerWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: SteerWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end
end
