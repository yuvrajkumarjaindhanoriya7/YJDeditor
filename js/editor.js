import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene,camera,renderer,orbit,transform,selected=null,grid;
let editable=[],history=[],historyIndex=-1;
const canvas=document.getElementById('canvas'), viewport=document.getElementById('viewport');

function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x1a1a1a);scene.name='Scene';
 camera=new THREE.PerspectiveCamera(50,viewport.clientWidth/viewport.clientHeight,.1,1000);camera.position.set(5,5,10);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(devicePixelRatio);renderer.setSize(viewport.clientWidth,viewport.clientHeight);renderer.shadowMap.enabled=true;
 orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.target.set(0,0,0);
 transform=new TransformControls(camera,canvas);transform.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);transform.addEventListener('objectChange',()=>{updateInspector();updateStats();saveHistory();});scene.add(transform);
 grid=new THREE.GridHelper(20,20,0x444444,0x222222);scene.add(grid);
 const ambient=new THREE.AmbientLight(0xffffff,.55);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffffff,1.2);sun.position.set(5,10,7);sun.castShadow=true;scene.add(sun);
 window.addEventListener('resize',resize);window.addEventListener('keydown',keys);canvas.addEventListener('click',pick);
 updateTree();updateStats();saveHistory();animate();
}
function animate(){requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);document.getElementById('cameraPos').textContent=`Camera: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`}
function resize(){camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();renderer.setSize(viewport.clientWidth,viewport.clientHeight)}
function keys(e){if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();if(k==='t')setTransformMode('translate');if(k==='r')setTransformMode('rotate');if(k==='s')setTransformMode('scale');if(k==='delete'||k==='backspace')deleteSelected();if(k==='c')centerCamera();if(k==='g')toggleGrid();if(e.ctrlKey&&k==='d'){e.preventDefault();cloneObject()}if(e.ctrlKey&&k==='z'){e.preventDefault();undo()}if(e.ctrlKey&&k==='y'){e.preventDefault();redo()}}
function pick(e){const r=canvas.getBoundingClientRect(),m=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(m,camera);const hit=ray.intersectObjects(editable,true)[0];if(hit)selectObject(hit.object)}
function addMesh(geometry,color,name){const material=new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.5});const mesh=new THREE.Mesh(geometry,material);mesh.position.y=.5;mesh.name=name+' '+(editable.length+1);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);editable.push(mesh);selectObject(mesh);updateTree();updateStats();saveHistory()}
window.addCube=()=>addMesh(new THREE.BoxGeometry(1,1,1),0x00ff88,'Cube');
window.addSphere=()=>addMesh(new THREE.SphereGeometry(.5,32,24),0xff5555,'Sphere');
window.addCylinder=()=>addMesh(new THREE.CylinderGeometry(.5,.5,1,32),0x55ccff,'Cylinder');
window.addTorus=()=>addMesh(new THREE.TorusGeometry(.5,.18,16,48),0xaa55ff,'Torus');
window.addCone=()=>addMesh(new THREE.ConeGeometry(.5,1,32),0xffcc33,'Cone');
window.addPlane=()=>{const g=new THREE.PlaneGeometry(2,2);const m=new THREE.MeshStandardMaterial({color:0x5577ff,side:THREE.DoubleSide,roughness:.5});const mesh=new THREE.Mesh(g,m);mesh.rotation.x=-Math.PI/2;mesh.name='Plane '+(editable.length+1);scene.add(mesh);editable.push(mesh);selectObject(mesh);updateTree();updateStats();saveHistory()};
function addLight(type){const l=type==='point'?new THREE.PointLight(0xffffff,2,30):type==='spot'?new THREE.SpotLight(0xffffff,2,30):new THREE.DirectionalLight(0xffffff,1.5);l.position.set(2,4,2);l.name=(type==='point'?'Point Light':type==='spot'?'Spot Light':'Directional Light')+' '+(editable.length+1);scene.add(l);editable.push(l);selectObject(l);updateTree();saveHistory()}
window.addPointLight=()=>addLight('point');window.addDirectionalLight=()=>addLight('directional');window.addSpotLight=()=>addLight('spot');
window.addCamera=()=>{const c=new THREE.PerspectiveCamera(60,1,.1,1000);c.position.set(3,3,3);c.name='Camera '+(editable.length+1);scene.add(c);editable.push(c);selectObject(c);updateTree();saveHistory()};
window.selectObject=o=>{selected=o;transform.attach(o);updateInspector();updateTree()};
function updateTree(){const tree=document.getElementById('sceneTree');tree.innerHTML='<div class="scene-item">📦 Scene</div>';editable.forEach(o=>{const d=document.createElement('div');d.className='scene-item'+(o===selected?' selected':'');d.textContent=icon(o)+' '+o.name;d.onclick=()=>selectObject(o);tree.appendChild(d)})}
function icon(o){if(o.isLight)return'💡';if(o.isCamera)return'📷';if(o.geometry?.type==='BoxGeometry')return'📦';if(o.geometry?.type==='SphereGeometry')return'⚪';return'🎯'}
function updateInspector(){if(!selected)return;const set=(id,v)=>document.getElementById(id).value=v;set('objName',selected.name);set('posX',selected.position.x.toFixed(2));set('posY',selected.position.y.toFixed(2));set('posZ',selected.position.z.toFixed(2));set('rotX',selected.rotation.x.toFixed(2));set('rotY',selected.rotation.y.toFixed(2));set('rotZ',selected.rotation.z.toFixed(2));set('scaleX',selected.scale.x.toFixed(2));set('scaleY',selected.scale.y.toFixed(2));set('scaleZ',selected.scale.z.toFixed(2));if(selected.material){set('objColor','#'+selected.material.color.getHexString());set('opacity',selected.material.opacity);set('metalness',selected.material.metalness??0);set('roughness',selected.material.roughness??.5);document.getElementById('wireframe').checked=selected.material.wireframe}}
window.updateProperty=()=>{if(!selected)return;const n=id=>parseFloat(document.getElementById(id).value);selected.name=document.getElementById('objName').value;selected.position.set(n('posX')||0,n('posY')||0,n('posZ')||0);selected.rotation.set(n('rotX')||0,n('rotY')||0,n('rotZ')||0);selected.scale.set(n('scaleX')||1,n('scaleY')||1,n('scaleZ')||1);if(selected.material){selected.material.color.set(document.getElementById('objColor').value);selected.material.opacity=n('opacity');selected.material.transparent=selected.material.opacity<1;selected.material.wireframe=document.getElementById('wireframe').checked;selected.material.metalness=n('metalness');selected.material.roughness=n('roughness')}updateTree();updateStats();saveHistory()};
window.setTransformMode=m=>{transform.setMode(m);['translate','rotate','scale'].forEach(x=>document.getElementById(x+'Btn').classList.toggle('active',x===m))};
window.deleteSelected=()=>{if(!selected)return;transform.detach();scene.remove(selected);editable=editable.filter(x=>x!==selected);selected=null;updateTree();updateStats();saveHistory()};
window.cloneObject=()=>{if(!selected)return;const c=selected.clone();c.name=selected.name+' Copy';c.position.x+=1;scene.add(c);editable.push(c);selectObject(c);updateStats();saveHistory()};
window.resetTransform=()=>{if(!selected)return;selected.position.set(0,0,0);selected.rotation.set(0,0,0);selected.scale.set(1,1,1);updateInspector();saveHistory()};
window.centerCamera=()=>{camera.position.set(5,5,10);orbit.target.set(0,0,0);orbit.update()};window.toggleGrid=()=>grid.visible=!grid.visible;
function updateStats(){let v=0,t=0;editable.forEach(o=>{if(o.isMesh){const p=o.geometry.attributes.position;v+=p?.count||0;t+=(o.geometry.index?o.geometry.index.count/3:(p?.count||0)/3)}});document.getElementById('objectCount').textContent=editable.length;document.getElementById('vertexCount').textContent=v;document.getElementById('triangleCount').textContent=Math.floor(t)}
function saveHistory(){history=history.slice(0,historyIndex+1);history.push(scene.toJSON());historyIndex=history.length-1;if(history.length>25){history.shift();historyIndex--}}
function restore(json){const loader=new THREE.ObjectLoader(),fresh=loader.parse(json);scene.clear();fresh.children.forEach(c=>scene.add(c));scene.add(transform);grid=scene.children.find(c=>c.isGridHelper)||new THREE.GridHelper(20,20);if(!grid.parent)scene.add(grid);editable=[];scene.traverse(o=>{if(o.isMesh||o.isLight||o.isCamera)editable.push(o)});selected=null;transform.detach();updateTree();updateStats()}
window.undo=()=>{if(historyIndex>0){historyIndex--;restore(history[historyIndex])}};window.redo=()=>{if(historyIndex<history.length-1){historyIndex++;restore(history[historyIndex])}};
function download(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),300)}
window.exportJSON=()=>download(JSON.stringify(scene.toJSON(),null,2),'yjd-scene.json','application/json');window.exportOBJ=()=>download(new OBJExporter().parse(scene),'yjd-scene.obj','text/plain');
window.exportGLTF=()=>new GLTFExporter().parse(scene,g=>download(JSON.stringify(g,null,2),'yjd-scene.gltf','model/gltf+json'),e=>alert('Export failed: '+e.message),{binary:false});
window.handleFileImport=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();if(file.name.endsWith('.json')){reader.onload=()=>restore(JSON.parse(reader.result));reader.readAsText(file)}else if(file.name.endsWith('.obj')){reader.onload=()=>{const o=new OBJLoader().parse(reader.result);scene.add(o);o.traverse(x=>{if(x.isMesh)editable.push(x)});updateTree();updateStats()};reader.readAsText(file)}else{reader.onload=()=>{const loader=new GLTFLoader();loader.parse(reader.result,'',g=>{scene.add(g.scene);g.scene.traverse(x=>{if(x.isMesh||x.isLight||x.isCamera)editable.push(x)});updateTree();updateStats()},err=>alert('Could not import model'))};reader.readAsArrayBuffer(file)}e.target.value=''};
window.newFile=()=>{if(confirm('Create a new scene?'))location.reload()};window.helpMenu=()=>location.href='help.html';
init();
