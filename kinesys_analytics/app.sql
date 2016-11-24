CREATE OR REPLACE STREAM "DESTINATION_SQL_STREAM" (device VARCHAR(16), sensor_name VARCHAR(16), sensor_value DOUBLE,
                                                   avg_sensor_value DOUBLE, min_time TIMESTAMP, max_time TIMESTAMP);

CREATE OR REPLACE PUMP "STREAM_PUMP" AS INSERT INTO "DESTINATION_SQL_STREAM"

SELECT STREAM device, sensor_name, sensor_value,
              AVG(sensor_value) OVER TEN_SECOND_SLIDING_WINDOW AS avg_sensor_value,
              MIN(approximate_arrival_time) OVER TEN_SECOND_SLIDING_WINDOW AS min_time,
              MAX(approximate_arrival_time) OVER TEN_SECOND_SLIDING_WINDOW AS max_time
FROM "SOURCE_SQL_STREAM_001"

WINDOW TEN_SECOND_SLIDING_WINDOW AS (
  PARTITION BY device, sensor_name
  RANGE INTERVAL '10' SECOND PRECEDING);

