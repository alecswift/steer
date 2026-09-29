defmodule SteerWeb.ChangesetJSON do
  @moduledoc """
  Renders changeset errors as `%{errors: %{field => [message]}}`. Errors in
  embedded waypoints nest as a list with one map per waypoint.
  """

  @doc """
  Renders a changeset's errors.
  """
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp translate_error({message, opts}) do
    Regex.replace(~r"%{(\w+)}", message, fn _, key ->
      opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
    end)
  end
end
