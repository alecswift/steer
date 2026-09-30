#!/bin/sh
# Downloads every BRouter segment file (the whole world, about 10 GB) into
# /segments4. Files already there are skipped, so a rerun resumes an
# interrupted download. To refresh the data, remove the volume first.
set -eu

BASE=https://brouter.de/brouter/segments4

cd /segments4
# The index names each file twice (link and text), hence sort -u.
tiles=$(curl -fsS "$BASE/" | grep -oE '[EW][0-9]+_[NS][0-9]+\.rd5' | sort -u)
total=$(echo "$tiles" | wc -l)
if [ -z "$tiles" ]; then
  echo "No segment files found at $BASE/" >&2
  exit 1
fi

n=0
for tile in $tiles; do
  n=$((n + 1))
  [ -e "$tile" ] && continue
  echo "[$n/$total] $tile"
  # Download to a temporary name so an interrupted file isn't mistaken
  # for a complete one.
  curl -fsS --retry 3 -o "$tile.part" "$BASE/$tile"
  mv "$tile.part" "$tile"
done

echo "Done: $total segment files in /segments4."
