#include "deliveryoptimizer/api/forecast_optimizer.hpp"

#include <gtest/gtest.h>
#include <json/json.h>
#include <optional>

namespace {

[[nodiscard]] deliveryoptimizer::api::OptimizeRequestInput BuildInput() {
  return deliveryoptimizer::api::OptimizeRequestInput{
      .depot_lon = -121.7405,
      .depot_lat = 38.5449,
      .vehicles =
          {
              deliveryoptimizer::api::VehicleInput{
                  .external_id = "driver-1",
                  .capacity = 8,
                  .start = std::nullopt,
                  .end = std::nullopt,
                  .time_window = std::nullopt,
              },
          },
      .jobs =
          {
              deliveryoptimizer::api::JobInput{
                  .external_id = "stop-1",
                  .lon = -121.748,
                  .lat = 38.545,
                  .demand = 1,
                  .service = 180,
                  .time_windows = std::nullopt,
              },
              deliveryoptimizer::api::JobInput{
                  .external_id = "stop-2",
                  .lon = -121.752,
                  .lat = 38.548,
                  .demand = 1,
                  .service = 120,
                  .time_windows = std::nullopt,
              },
          },
  };
}

} // namespace

TEST(WeatherForecastOptimizerTest, DisabledWeatherHasNoImpact) {
  const deliveryoptimizer::api::WeatherForecastOptions options{
      .enabled = false,
      .weather_delay_seconds_per_stop = 200,
      .reoptimize_threshold_seconds = 100,
      .reoptimize_threshold_percent = 0.0,
      .openweather_api_key = "",
      .openweather_base_url = "",
  };

  const deliveryoptimizer::api::WeatherImpactEstimate impact =
      deliveryoptimizer::api::EstimateWeatherImpact(options, 2U, 300);

  EXPECT_EQ(impact.weather_delay_seconds, 0);
  EXPECT_FALSE(impact.should_reoptimize);
}

TEST(WeatherForecastOptimizerTest, BelowThresholdWeatherDoesNotChangeVroomInput) {
  const auto input = BuildInput();
  const deliveryoptimizer::api::WeatherForecastOptions options{
      .enabled = true,
      .weather_delay_seconds_per_stop = 30,
      .reoptimize_threshold_seconds = 300,
      .reoptimize_threshold_percent = 0.0,
      .openweather_api_key = "",
      .openweather_base_url = "",
  };

  const Json::Value payload = deliveryoptimizer::api::BuildWeatherAdjustedVroomInput(
      input, deliveryoptimizer::api::EstimateWeatherImpact(options, input.jobs.size(), 300));

  ASSERT_TRUE(payload["jobs"].isArray());
  ASSERT_EQ(payload["jobs"].size(), 2U);
  EXPECT_EQ(payload["jobs"][0]["service"].asInt(), 180);
  EXPECT_EQ(payload["jobs"][1]["service"].asInt(), 120);
}

TEST(WeatherForecastOptimizerTest, AboveThresholdWeatherAddsServiceTime) {
  const auto input = BuildInput();
  const deliveryoptimizer::api::WeatherForecastOptions options{
      .enabled = true,
      .weather_delay_seconds_per_stop = 200,
      .reoptimize_threshold_seconds = 100,
      .reoptimize_threshold_percent = 0.0,
      .openweather_api_key = "",
      .openweather_base_url = "",
  };

  const Json::Value payload = deliveryoptimizer::api::BuildWeatherAdjustedVroomInput(
      input, deliveryoptimizer::api::EstimateWeatherImpact(options, input.jobs.size(), 300));
  const deliveryoptimizer::api::WeatherImpactEstimate impact =
      deliveryoptimizer::api::EstimateWeatherImpact(options, input.jobs.size(), 300);
  const Json::Value forecast =
      deliveryoptimizer::api::BuildWeatherForecastAnnotation(options, impact);

  ASSERT_TRUE(payload["jobs"].isArray());
  ASSERT_EQ(payload["jobs"].size(), 2U);
  EXPECT_EQ(payload["jobs"][0]["service"].asInt(), 380);
  EXPECT_EQ(payload["jobs"][1]["service"].asInt(), 320);
  EXPECT_EQ(forecast["weather_delay_seconds"].asInt(), 400);
  EXPECT_TRUE(forecast["reoptimization"]["applied"].asBool());
}

TEST(WeatherForecastOptimizerTest, ReadsVroomSummaryDuration) {
  Json::Value output{Json::objectValue};
  output["summary"] = Json::Value{Json::objectValue};
  output["summary"]["duration"] = 124.2;

  const std::optional<int> duration =
      deliveryoptimizer::api::ReadVroomSummaryDurationSeconds(output);

  ASSERT_TRUE(duration.has_value());
  EXPECT_EQ(*duration, 125);
}

TEST(WeatherForecastOptimizerTest, IgnoresMissingVroomSummaryDuration) {
  const Json::Value output{Json::objectValue};

  EXPECT_FALSE(deliveryoptimizer::api::ReadVroomSummaryDurationSeconds(output).has_value());
}

TEST(WeatherForecastOptimizerTest, ReadsEarliestVehicleStartTime) {
  auto input = BuildInput();
  input.vehicles.push_back(deliveryoptimizer::api::VehicleInput{
      .external_id = "driver-2",
      .capacity = 8,
      .start = std::nullopt,
      .end = std::nullopt,
      .time_window =
          deliveryoptimizer::api::TimeWindow{
              .start = std::chrono::sys_seconds{std::chrono::seconds{1800}},
              .end = std::chrono::sys_seconds{std::chrono::seconds{7200}},
          },
  });
  input.vehicles[0].time_window = deliveryoptimizer::api::TimeWindow{
      .start = std::chrono::sys_seconds{std::chrono::seconds{900}},
      .end = std::chrono::sys_seconds{std::chrono::seconds{3600}},
  };

  const std::optional<std::chrono::sys_seconds> planned_start =
      deliveryoptimizer::api::ReadPlannedRouteStartTime(input);

  ASSERT_TRUE(planned_start.has_value());
  EXPECT_EQ(planned_start->time_since_epoch(), std::chrono::seconds{900});
}

TEST(WeatherForecastOptimizerTest, MissingVehicleTimeWindowHasNoPlannedStart) {
  const auto input = BuildInput();

  EXPECT_FALSE(deliveryoptimizer::api::ReadPlannedRouteStartTime(input).has_value());
}
