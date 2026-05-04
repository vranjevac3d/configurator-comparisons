import * as THREE from "three";

const NAIL_PRESETS = [
  { size: "1",  standard: 0.008,   spacing: 0.0155, radius: 0.003935  },
  { size: "2",  standard: 0.012,   spacing: 0.024,  radius: 0.00559   },
  { size: "3",  standard: 0.016,   spacing: 0.028,  radius: 0.00802   },
  { size: "4",  standard: 0.0205,  spacing: 0.041,  radius: 0.01033   },
  { size: "5",  standard: 0.0235,  spacing: 0.047,  radius: 0.011865  },
  { size: "6",  standard: 0.016,   spacing: 0.033,  radius: 0.007853  },
  { size: "7",  standard: 0.0105,  spacing: 0.021,  radius: 0.005507  },
  { size: "9",  standard: 0.0105,  spacing: 0.021,  radius: 0.005507  },
  { size: "54", standard: 0.016,   spacing: 0.033,  radius: 0.0078535 },
];

export const nailMaterial = new THREE.MeshStandardMaterial({
  name: "nail_finish",
  color: 0xb8860b,
  metalness: 0.8,
  roughness: 0.3,
});

function extractCurveParameters(name) {
  const allowed = ["standard_nail", "standard_nail2"];
  const matched = allowed.find(opt => name.startsWith(opt + "_"));
  if (!matched) return null;

  const pattern = new RegExp(
    `^(${matched})_([a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*)_curve_#(\\d+)_([A-Z])`
  );
  const m = name.match(pattern);
  if (!m) return null;

  return { optionName: m[1], area: m[2], nailSize: m[3], spacing: m[4] };
}

function modifyUV(geometry) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i);
    let v = uv.getY(i);
    u = u < 0.5 ? u * 2 : (1 - u) * 2;
    uv.setXY(i, u, 1 - v);
  }
  uv.needsUpdate = true;
}

function distributeAlongPath(vectors, spacing) {
  const EPSILON = 0.000000000000005;
  const fix = n => parseFloat(n.toFixed(16));

  let fullDist = 0;
  for (let i = 1; i < vectors.length; i++) fullDist += vectors[i].distanceTo(vectors[i - 1]);
  fullDist = fix(fullDist);

  const count     = Math.floor(fullDist / spacing);
  const remainder = fix(fullDist - count * spacing);
  const step      = fix(spacing + fix(remainder / count));

  const items = [];
  let currentItem = new THREE.Vector3();
  let currentDist = 0;

  for (let index = 0; index < vectors.length; index++) {
    if (items.length === 0) {
      items.push(vectors[index]);
      continue;
    }

    const prev = currentDist ? currentItem : items[items.length - 1];
    const segLen = prev.distanceTo(vectors[index]);

    if (segLen >= step - currentDist) {
      const offset = new THREE.Vector3()
        .copy(vectors[index])
        .sub(prev)
        .setLength(step - currentDist - EPSILON);
      items.push(new THREE.Vector3().copy(prev).add(offset));
      currentDist = 0;
      index--;
    } else {
      currentItem = new THREE.Vector3().copy(vectors[index]);
      currentDist = fix(currentDist + segLen);
    }
  }

  return items;
}

export function buildNails(model) {
  model.traverse((node) => {
    if (!node.name.includes("_curve") || node.type !== "LineSegments") return;

    // Remove any previously built nail groups
    node.children.slice().forEach((c) => {
      if (c.name === "Nail Group") {
        c.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        node.remove(c);
      }
    });

    const params = extractCurveParameters(node.name);

    const { count, array } = node.geometry.attributes.position;
    const vectors = [];
    for (let i = 0; i < count; i++) {
      vectors.push(new THREE.Vector3(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]));
    }

    let spacing = 0.0105;
    let radius  = 0.005507;
    if (params) {
      const preset = NAIL_PRESETS.find(p => p.size === params.nailSize);
      if (preset) {
        spacing = params.spacing === "H" ? preset.standard : preset.spacing;
        radius  = preset.radius;
      }
    }

    const positions = distributeAlongPath(vectors, spacing);

    const geometry = new THREE.SphereGeometry(radius, 10, 10);
    modifyUV(geometry);

    const mesh = new THREE.InstancedMesh(geometry, nailMaterial, positions.length);
    mesh.name = "Nail Mesh";

    const dummy = new THREE.Object3D();
    positions.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    const group = new THREE.Group();
    group.name = "Nail Group";
    group.add(mesh);

    node.add(group);
    node.visible = true;
    node.material.transparent = true;
    node.material.opacity = 0;
  });
}
