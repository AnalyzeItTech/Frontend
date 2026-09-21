const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

function collectRings(geom, rings) {
  if (!geom) return;
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring) => {
      if (ring.length >= 4) rings.push(ring.map(([lon, lat]) => [Number(lon.toFixed(2)), Number(lat.toFixed(2))]));
    });
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((poly) => {
      poly.forEach((ring) => {
        if (ring.length >= 4) rings.push(ring.map(([lon, lat]) => [Number(lon.toFixed(2)), Number(lat.toFixed(2))]));
      });
    });
  }
}

function generate() {
  const topoPath = path.join(__dirname, '../node_modules/world-atlas/countries-110m.json');
  const rawTopo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
  const geojson = topojson.feature(rawTopo, rawTopo.objects.countries);
  const rings = [];

  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach((feat) => collectRings(feat.geometry, rings));
  } else if (geojson.type === 'Feature') {
    collectRings(geojson.geometry, rings);
  }

  const totalPoints = rings.reduce((n, r) => n + r.length, 0);
  const tsContent = `// Natural Earth 110m country rings (lon, lat). Stroke-only — do not resample or jitter.
// Converted from world-atlas/countries-110m.json. Rings: ${rings.length} | Points: ${totalPoints}

export const WORLD_COUNTRY_RINGS: Array<Array<[number, number]>> = ${JSON.stringify(rings)};
`;

  const outputPath = path.join(__dirname, '../app/Components/3d/countryBorders.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log(`Saved ${rings.length} country rings (${totalPoints} points) to ${outputPath}`);
}

generate();
