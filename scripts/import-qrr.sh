#!/bin/bash

CONNECTION="PG:postgresql://postgres:postgres@localhost:54322/postgres"
FILE="scripts/data/qrr/contours_QRR.shp"

echo "Importing QRR data..."

ogr2ogr -f "PostgreSQL" \
  "$CONNECTION" \
  "$FILE" \
  -nln Qrr \
  -append \
  -nlt MULTIPOLYGON \
  -t_srs EPSG:4326

echo "Done!"