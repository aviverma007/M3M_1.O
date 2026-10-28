#!/bin/bash
# round-trip my modules on every reference PDF; prints per-pdf totals
cd "$(dirname "$0")/.."
for f in ../noida/*.pdf ../full204/full.pdf; do
  b=$(basename $f .pdf); lc='M3M Noida'; [ $b = full ] && lc=Smartworld
  out=$(N=${N:-12} python3 build.py $f /tmp/rt_ls_$b --only landscape,serviceDesign,structure,mep --project-json "{\"locationCategory\":\"$lc\"}" 2>&1)
  echo "$b: $(echo "$out" | grep TOTAL) $(echo "$out" | grep -c 'PAGE COUNT') pagecount-mismatch"
done
