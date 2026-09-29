defmodule Steer.Routes.StatsTest do
  use Steer.DataCase, async: true

  alias Steer.Routes.Stats

  # Lines run along the equator, where 0.01° of longitude is exactly
  # 6378137 m (the WGS 84 equatorial radius) × 0.01 × π / 180 ≈ 1113.195 m.
  @equator_0_01_deg_m 6_378_137 * 0.01 * :math.pi() / 180

  # A line along the equator from 0° to 0.01° east with these elevations,
  # evenly spaced.
  defp line(elevations) do
    step = 0.01 / (length(elevations) - 1)

    coordinates =
      elevations
      |> Enum.with_index()
      |> Enum.map(fn {z, i} -> {i * step, 0.0, z} end)

    %Geo.LineStringZ{coordinates: coordinates, srid: 4326}
  end

  describe "compute/1" do
    test "a flat line" do
      stats = Stats.compute(line([100, 100]))

      assert_in_delta stats.distance_m, @equator_0_01_deg_m, 0.001
      assert %{min_ele_m: 100.0, max_ele_m: 100.0, gain_m: +0.0, loss_m: +0.0} = stats
    end

    test "a climbing line" do
      stats = Stats.compute(line([100, 150, 200]))

      assert_in_delta stats.distance_m, @equator_0_01_deg_m, 0.001
      assert %{min_ele_m: 100.0, max_ele_m: 200.0, gain_m: 100.0, loss_m: +0.0} = stats
    end

    test "a line that goes up then down" do
      stats = Stats.compute(line([100, 250, 400, 250, 120]))

      assert %{min_ele_m: 100.0, max_ele_m: 400.0, gain_m: 300.0, loss_m: 280.0} = stats
    end

    test "ignores wobbles within 5 m" do
      assert %{gain_m: +0.0, loss_m: +0.0} = Stats.compute(line([100, 102, 100, 105, 101, 100]))
    end

    test "counts a climb in full across a dip within 5 m" do
      assert %{gain_m: 100.0, loss_m: +0.0} = Stats.compute(line([100, 150, 146, 200]))
    end

    test "counts a climb that starts after a small dip from its lowest point" do
      assert %{gain_m: 9.0, loss_m: +0.0} = Stats.compute(line([100, 97, 106]))
    end

    test "counts a descent that ends the line" do
      assert %{gain_m: 50.0, loss_m: 30.0} = Stats.compute(line([100, 150, 120]))
    end

    test "ignores a final climb within 5 m" do
      assert %{gain_m: +0.0, loss_m: 50.0} = Stats.compute(line([150, 100, 104]))
    end

    test "counts rolling terrain above the threshold" do
      assert %{gain_m: 18.0, loss_m: 12.0} = Stats.compute(line([100, 106, 100, 106, 100, 106]))
    end
  end
end
