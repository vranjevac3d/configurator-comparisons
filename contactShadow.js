import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";

let blurPlane, horizontalBlurMaterial, verticalBlurMaterial;

export function contactShadow(model, scene, floorPlane, shadowGroup, renderTarget, camera) {
  while (shadowGroup.children.length) shadowGroup.remove(shadowGroup.children[0]);

  const bbox = new Box3().setFromObject(model);

  const SHADOW_OFFSET = 5;
  const WIDTH = bbox.getSize(new Vector3()).x * SHADOW_OFFSET;
  const CAMERA_HEIGHT = bbox.max.y;
  const OPACITY = 0.5;

  const geometry = new PlaneGeometry(WIDTH, WIDTH).rotateX(Math.PI / 2);

  const shadowPlane = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: 0x000000,
      map: renderTarget.texture,
      opacity: OPACITY,
      transparent: true,
      depthWrite: false,
    })
  );
  shadowPlane.name = "Shadow Plane";
  shadowPlane.renderOrder = 1;
  shadowPlane.scale.y = -1;
  shadowPlane.position.y = bbox.min.y + 0.001;

  blurPlane = new Mesh(geometry);
  blurPlane.name = "Blur Plane";
  blurPlane.visible = false;

  camera.left = -WIDTH / 2;
  camera.right = WIDTH / 2;
  camera.top = WIDTH / 2;
  camera.bottom = -WIDTH / 2;
  camera.near = 0;
  camera.far = CAMERA_HEIGHT;
  camera.rotation.x = Math.PI / 2;
  camera.updateProjectionMatrix();

  const children = [shadowPlane, blurPlane, camera];
  if (floorPlane) children.push(floorPlane);
  shadowGroup.add(...children);

  horizontalBlurMaterial = new ShaderMaterial(HorizontalBlurShader);
  horizontalBlurMaterial.depthTest = false;

  verticalBlurMaterial = new ShaderMaterial(VerticalBlurShader);
  verticalBlurMaterial.depthTest = false;
}

let renderTargetBlur;

export function blurShadow(amount, renderTarget, camera, renderer) {
  if (!renderTargetBlur) {
    const RES = renderTarget.width;
    renderTargetBlur = new WebGLRenderTarget(RES, RES);
    renderTargetBlur.texture.generateMipmaps = false;
  }

  if (!blurPlane) return;

  blurPlane.visible = true;

  blurPlane.material = horizontalBlurMaterial;
  blurPlane.material.uniforms.tDiffuse.value = renderTarget.texture;
  horizontalBlurMaterial.uniforms.h.value = amount / 256;

  renderer.setRenderTarget(renderTargetBlur);
  renderer.render(blurPlane, camera);

  blurPlane.material = verticalBlurMaterial;
  blurPlane.material.uniforms.tDiffuse.value = renderTargetBlur.texture;
  verticalBlurMaterial.uniforms.v.value = amount / 256;

  renderer.setRenderTarget(renderTarget);
  renderer.render(blurPlane, camera);

  blurPlane.visible = false;
}
