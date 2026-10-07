defmodule SteerWeb.Router do
  use SteerWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", SteerWeb do
    pipe_through :api

    get "/health", HealthController, :show
    resources "/routes", RouteController, except: [:new, :edit]
    post "/snap", SnapController, :create
  end
end
