const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

function generate() {
  const topoPath = path.join(__dirname, '../node_modules/world-atlas/land-110m.json');
  const rawTopo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));

  // Convert TopoJSON to GeoJSON
  const geojson = topojson.feature(rawTopo, rawTopo.objects.land);

  console.log('GeoJSON Type:', geojson.type);

  const polygons = [];
  let totalPoints = 0;

  if (geojson.type === 'Feature') {
    const geom = geojson.geometry;
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach((ring, rIdx) => {
        polygons.push({
          name: `Land Ring ${polygons.length + 1}`,
          coords: ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]),
        });
        totalPoints += ring.length;
      });
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly, pIdx) => {
        poly.forEach((ring, rIdx) => {
          // Filter out tiny slivers (< 6 points) to keep performance snappy while preserving all real islands
          if (ring.length >= 6) {
            polygons.push({
              name: `Land Polygon ${polygons.length + 1}`,
              coords: ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]),
            });
            totalPoints += ring.length;
          }
        });
      });
    }
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach((feat, fIdx) => {
      const geom = feat.geometry;
      if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring) => {
          polygons.push({
            name: feat.properties?.name || `Polygon ${polygons.length + 1}`,
            coords: ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]),
          });
          totalPoints += ring.length;
        });
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((poly) => {
          poly.forEach((ring) => {
            if (ring.length >= 6) {
              polygons.push({
                name: feat.properties?.name || `Polygon ${polygons.length + 1}`,
                coords: ring.map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))]),
              });
              totalPoints += ring.length;
            }
          });
        });
      }
    });
  }

  console.log(`Extracted ${polygons.length} authentic Natural Earth polygon rings with ${totalPoints} total coordinate points.`);

  // Sort largest polygons first
  polygons.sort((a, b) => b.coords.length - a.coords.length);

  // Print top polygon point counts
  polygons.slice(0, 15).forEach((p, idx) => {
    console.log(`- Feature ${idx + 1} (${p.name}): ${p.coords.length} coordinate points`);
  });

  // Generate TypeScript File
  const tsContent = `// Natural Earth 110m Resolution Landmass Dataset
// Mechanically converted from world-atlas/land-110m.json using topojson-client
// Total Polygon Rings: ${polygons.length} | Total Verified Points: ${totalPoints}

export interface GeoPolygon {
  name: string;
  coords: Array<[number, number]>; // [lon, lat]
}

export const WORLD_LANDMASS_POLYGONS: GeoPolygon[] = ${JSON.stringify(polygons, null, 2)};
`;

  const outputPath = path.join(__dirname, '../app/Components/3d/landmassData.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log(`Saved authentic Natural Earth data to: ${outputPath}`);
}

generate();
