#!/bin/bash

CONNECTION="PG:postgresql://postgres:postgres@localhost:54322/postgres"
FILE="scripts/data/QP2024_France_Hexagonale_Outre_Mer_WGS84.geojson"

echo "Importing QPV data..."

ogr2ogr -f "PostgreSQL" \
  "$CONNECTION" \
  "$FILE" \
  -nln Qpv \
  -append \
  -nlt MULTIPOLYGON \
  -t_srs EPSG:4326

echo "Done!"