
let fragmentShaderHeader = [''                      // WHATEVER CODE WE WANT TO PREDEFINE FOR FRAGMENT SHADERS
,'   precision highp float;'
,'float noise(vec3 v) {'
,'   vec4 r[2];'
,'   const mat4 E = mat4(0.,0.,0.,0., 0.,.5,.5,0., .5,0.,.5,0., .5,.5,0.,0.);'
,'   for (int j = 0 ; j < 2 ; j++)'
,'   for (int i = 0 ; i < 4 ; i++) {'
,'      vec3 p = .60*v + E[i].xyz, C = floor(p), P = p - C-.5, A = abs(P), D;'
,'      C += mod(C.x+C.y+C.z+float(j),2.) * step(max(A.yzx,A.zxy),A)*sign(P);'
,'      D  = 314.1*sin(59.2*float(i+4*j) + 65.3*C + 58.9*C.yzx + 79.3*C.zxy);'
,'      r[j][i] = dot(P=p-C-.5,fract(D)-.5) * pow(max(0.,1.-2.*dot(P,P)),4.);'
,'   }'
,'   return 6.50 * (r[0].x+r[0].y+r[0].z+r[0].w+r[1].x+r[1].y+r[1].z+r[1].w);'
,'}'
].join('\n');


let nfsh = fragmentShaderHeader.split('\n').length;         // # LINES OF CODE IN fragmentShaderHeader
let isFirefox = navigator.userAgent.indexOf('Firefox') > 0; // IS THIS THE FIREFOX BROWSER?
let errorMsg = '';                                          // ERROR MESSAGE IF SHADER COMPILER FAILS.
let gl;                                                            // THE GL CONTEXT OBJECT


///////////////////////////////////////////////////////////////////////
//
// WE HAVE INCREASED STRIDE TO 8. A VERTEX IS NOW: x,y,z, nx,ny,nz, u,v
//
///////////////////////////////////////////////////////////////////////


let stride = 8;                                             // NUMBER OF VALUES PER VERTEX


///////////////////////////////////
//
// START WEBGL RUNNING IN A CANVAS.
//
///////////////////////////////////


// HANDLE MOUSE MOVE, PRESS, DRAG AND RELEASE.

addEventListenersToCanvas = function(canvas) {
   let r = canvas.getBoundingClientRect();
   let toX = x => 2 * (x-18 - r.left) / canvas.width - 1,
       toY = y => (canvas.height - 2 * (y - r.top)) / canvas.width;

   if (! canvas.onDrag   ) canvas.onDrag    = (x, y) => { };
   if (! canvas.onMove   ) canvas.onMove    = (x, y) => { };
   if (! canvas.onPress  ) canvas.onPress   = (x, y) => { };
   if (! canvas.onRelease) canvas.onRelease = (x, y) => { };

   canvas.addEventListener('mousemove', function(e) { this._response = this._isDown ? this.onDrag : this.onMove;
                                                      this._response(toX(e.clientX), toY(e.clientY));                      }, false);
   canvas.addEventListener('mousedown', function(e) { this.onPress  (toX(e.clientX), toY(e.clientY)); this._isDown = true ;}, false);
   canvas.addEventListener('mouseup'  , function(e) { this.onRelease(toX(e.clientX), toY(e.clientY)); this._isDown = false;}, false);
}


function gl_start(canvas, vertexShader, fragmentShader) {

   addEventListenersToCanvas(canvas);

   setTimeout(function() {
      try { 
         canvas.gl = canvas.getContext('experimental-webgl');              // Make sure WebGl is supported.
      } catch (e) { throw 'Sorry, your browser does not support WebGL.'; }

      canvas.setShaders = function(vertexShader, fragmentShader) {         // Add the vertex and fragment shaders:

         gl = this.gl, program = gl.createProgram();                        // Create the WebGL program.

         function addshader(type, src) {                                        // Create and attach a WebGL shader.
            function spacer(color, width, height) {
               return '<table bgcolor=' + color +
                            ' width='   + width +
                            ' height='  + height + '><tr><td>&nbsp;</td></tr></table>';
            }
            errorMessage.innerHTML = '<br>';
            errorMarker.innerHTML = spacer('black', 1, 1) + '<font size=5 color=black>\u25B6</font>';
            let shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
               let msg = gl.getShaderInfoLog(shader);
               console.log('Cannot compile shader:\n\n' + msg);

               let a = msg.substring(6, msg.length);
               if (a.substring(0, 3) == ' 0:') {
                  a = a.substring(3, a.length);
                  let line = parseInt(a) - nfsh;
                  let nPixels = isFirefox ? 17 * line - 10 : 18 * line - 1;
                  errorMarker.innerHTML = spacer('black', 1, nPixels) + '<font size=5>\u25B6</font>';
               }

               let j = a.indexOf(':');
               a = a.substring(j+2, a.length);
               if ((j = a.indexOf('\n')) > 0)
                  a = a.substring(0, j);
               errorMessage.innerHTML = a;
            }
            gl.attachShader(program, shader);
         };

         addshader(gl.VERTEX_SHADER  , vertexShader  );                         // Add the vertex and fragment shaders.
         addshader(gl.FRAGMENT_SHADER, fragmentShaderHeader + fragmentShader);

         gl.linkProgram(program);                                               // Link the program, report any errors.
         if (! gl.getProgramParameter(program, gl.LINK_STATUS))
            console.log('Could not link the shader program!');
         gl.useProgram(program);
         gl.program = program;

         gl.enable(gl.DEPTH_TEST);                                              // Set up WebGL to render the
         gl.depthFunc(gl.GEQUAL);                                               // nearest object at each pixel.
         gl.clearDepth(-1.0);

         gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());                     // Create a square as a triangle strip

         let aPos = gl.getAttribLocation(program, 'aPos');                      // Set aPos attribute for each vertex.
         let aNor = gl.getAttribLocation(program, 'aNor');                      // Set aNor attribute for each vertex.
         let aUV  = gl.getAttribLocation(program, 'aUV' );                      // Set aUV  attribute for each vertex.
         gl.enableVertexAttribArray(aPos);
         gl.enableVertexAttribArray(aNor);
         gl.enableVertexAttribArray(aUV );
         let bpe = Float32Array.BYTES_PER_ELEMENT;
         gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride * bpe, 0      );
         gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, stride * bpe, 3 * bpe);
         gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, stride * bpe, 6 * bpe);
      }

      canvas.setShaders(vertexShader, fragmentShader);                     // Initialize everything,

      setInterval(function() {                                             // Start the animation loop.
         gl = canvas.gl;
         gl.clear(gl.DEPTH_BUFFER_BIT);
         animate();
      }, 30);

   }, 100); // Wait 100 milliseconds after page has loaded before starting WebGL.
}

function animate() { }                   // animate() callback function can be redefined in index.html.


////////////////////////////////////////////////////////////////////
//
// SUPPORT CODE FOR CREATING DIFFERENT 3D SHAPES AS TRIANGLE MESHES.
//
////////////////////////////////////////////////////////////////////

let V3 = {
  cross     : (a, b) => [ a[1] * b[2] - a[2] * b[1],
                          a[2] * b[0] - a[0] * b[2],
                          a[0] * b[1] - a[1] * b[0] ],

  dot       : (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],

  equal     : (a, b) => V3.norm(V3.subtract(a, b)) < .001,

  norm      : v => Math.sqrt(V3.dot(v, v)),

  normalize : v => { let s = Math.sqrt( v[0] * v[0] + v[1] * v[1] + v[2] * v[2] );
                     return [ v[0] / s, v[1] / s, v[2] / s ]; },

  subtract  : (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ],
}

let createTriangleMesh = (uvToVertex, nCols, nRows, data) => {
   let mesh = [];
   let appendVertex = (f, u, v, data) => {
      v = Math.max(1/1000, Math.min(v, 1 - 2/1000));
      let p = f(u, v, data);
      if (p) {
         for (let n = 0 ; n < p.length ; n++)
            mesh.push(p[n]);

         // IF NO SURFACE NORMAL WAS PRODUCED BY uvToVertex

         if (p.length == 3) {

            // THEN COMPUTE TWO TANGENT VECTORS

            let pu = f(u + 1/1000, v, data);
            let pv = f(u, v + 1/1000, data);
            let du = [], dv = [];
            for (let i = 0 ; i < 3 ; i++) {
               du[i] = pu[i] - p[i];
               dv[i] = pv[i] - p[i];
            }

            // USE THOSE VECTORS TO COMPUTE AND ADD THE NORMAL

            let n = V3.normalize(V3.cross(du, dv));
            mesh.push(n[0], n[1], n[2], u, v);
         }
      }
   }
   for (let row = 0 ; row < nRows ; row++) {
      let v0 =  row    / nRows,
          v1 = (row+1) / nRows;
      for (let col = 0 ; col <= nCols ; col++) {
         let u = col / nCols;
         appendVertex(uvToVertex, u, v0, data);
         appendVertex(uvToVertex, u, v1, data);
      }
      appendVertex(uvToVertex, 1, v1, data);
      appendVertex(uvToVertex, 0, v1, data);
   }
   return mesh;
}


////////////////////////////////////////////////////////////////////////
//
// YOU NEED TO IMPLEMENT glueMeshes(), FOLLOWING THE INSTRUCTIONS BELOW.
//
////////////////////////////////////////////////////////////////////////


let glueMeshes = (a,b) => {           // GLUE TOGETHER TWO TRIANGLE MESHES.

   // HANDLE TRIVIAL CASES: WHEN ONE OF THE MESHES IS EMPTY,
   //                       JUST RETURN THE OTHER MESH.

   // OTHERWISE:

   // START WITH AN EMPTY ARRAY, THEN:
   // (1) ADD FIRST MESH.
   // (2) ADD LAST VERTEX OF FIRST MESH (THE LAST stride VALUES IN a).
   // (3) ADD FIRST VERTEX OF SECOND MESH (THE FIRST stride VALUES in b).
   // (4) ADD SECOND MESH.

   // RETURN THE RESULT OF THE FOUR ABOVE OPERATIONS.
}


////////////////////////////////////////////////////////////////////////
//
// YOU NEED TO IMPLEMENT THE FOLLOWING FUNCTIONS. MOST OF THEM YOU HAVE
// ALREADY IMPLEMENTED IN EARLIER HOMEWORK ASSIGNMENTS, EXCEPT NOW YOU
// NEED TO REMEMBER TO ADD u,v AT THE END OF EACH VERTEX.
//
////////////////////////////////////////////////////////////////////////


let uvToSphere = (u,v) => {
   let theta = 2 * Math.PI * u,
       phi = Math.PI * (v - 1/2);
   return [ Math.cos(phi) * Math.cos(theta),
            Math.cos(phi) * Math.sin(theta),
            Math.sin(phi) ];
}

let uvToTorus = (u,v,r) => {
}

let uvToTube = (u,v) => {
}


let coneNxy = Math.sqrt(4/5);
let coneNz  = Math.sqrt(1/5);

let uvToOpenCone = (u,v) => {
   let theta = 2 * Math.PI * u;
   let x = Math.cos(theta) * (1-v),
       y = Math.sin(theta) * (1-v),
       z = 2 * v - 1;

   // return [ x,y,z, coneNxy * x,coneNxy * y,coneNz, u,v ];

   return [ x,y,z ];
}


// RETURN ONLY X,Y,Z. createTriangleMesh() WILL COMPUTE THE NORMAL.

let uvToTwistyTorus = (u,v) =>
   [ Math.cos(2 * Math.PI * u) * (1 + .4 * Math.cos(2 * Math.PI * v)),
     Math.sin(2 * Math.PI * u) * (1 + .4 * Math.cos(2 * Math.PI * v)),
     .2 * Math.sin(2 * Math.PI * (8 * u + v) + time) ];


let uvToDisk = (u,v,s) => {
   let theta = 2 * Math.PI * u,
       x = Math.cos(theta),
       y = Math.sin(theta),
       z = 0;

   if (s === undefined)
      s = 1;
   else
      z = s;

   return [ v*x*s,v*y,z, 0,0,s, u,v ];
}


let uvToSquare = (u,v) => [ 2*u-1,2*v-1,0, 0,0,1, u,v ];


let disk     = createTriangleMesh(uvToDisk    , 30,  2);
let openCone = createTriangleMesh(uvToOpenCone, 30,  2);
let sphere   = createTriangleMesh(uvToSphere  , 30, 15);
let square   = createTriangleMesh(uvToSquare  ,  2,  2);
let torus    = createTriangleMesh(uvToTorus   , 30, 15);
let tube     = createTriangleMesh(uvToTube    , 30,  2);


let createSquareMesh = n => createTriangleMesh(uvToSquare, n, n);


//////////////////////////////////////////////////////////////////////////////
//
// cylinder, cone and cube WON'T WORK UNTIL YOU HAVE IMPLEMENTED glueMeshes().
//
//////////////////////////////////////////////////////////////////////////////


let cylinder = glueMeshes(tube,
               glueMeshes(createTriangleMesh(uvToDisk, 30, 2, -1),
                          createTriangleMesh(uvToDisk, 30, 2,  1)));

let cone = glueMeshes(openCone,
                      createTriangleMesh(uvToDisk, 30, 2, -1));
    
let cube = [];
for (let s = -1 ; s <= 1 ; s += 2) {  // Loop thru two faces for each axis
   let v = [ new Array(stride),
             new Array(stride),
             new Array(stride),
             new Array(stride) ];
   for (let i = 0 ; i < 3 ; i++) {    // Loop thru x,y,z axes
      let j = (i + 1) % 3,
          k = (i + 2) % 3;
      for (let m = 0 ; m < 4 ; m++) { // Loop thru the 4 corners of one face

         v[m][i]   = m > 1 ? s : -s;       // Position
         v[m][j]   = m & 1 ? 1 : -1;
         v[m][k]   = s;

         v[m][i+3] = 0;                    // Normal
         v[m][j+3] = 0;
         v[m][k+3] = s;

         v[m][6]   = (1 + v[m][i]) / 2;    // u,v
         v[m][7]   = (1 + v[m][j]) / 2;
      }
      cube = glueMeshes(cube, v[0].concat(v[1].concat(v[2].concat(v[3]))));
   }
}



////////////////////////////////////////////////////////
//
// SUPPORT CODE FOR SENDING UNIFORM DATA DOWN TO THE GPU
//
////////////////////////////////////////////////////////


// SEND A UNIFORM VALUE DOWN TO THE GPU.

function setUniform(type, name, a, b, c, d, e, f) {
   let loc = gl.getUniformLocation(gl.program, name);
   (gl['uniform' + type])(loc, a, b, c, d, e, f);
}


// CREATE A PERSPECTIVE VIEW FROM CAMERA DISTANCE f.

let createPerspectiveMatrix = f => [1,0,0,0, 0,1,0,0, 0,0,1,-1/f, 0,0,0,1];


// CREATE A UNIFORM MATRIX DESCRIBING A PHONG BASED MATERIAL.

let phong = (a,d,s,p,ta,tf) => [ a[0],a[1],a[2],0,  // AMBIENT COLOR
                                 d[0],d[1],d[2],0,  // DIFFUSE COLOR
                                 s[0],s[1],s[2],p,  // SPECULAR COLOR AND POWER
                                 ta===undefined ? 0 : ta,         // OPTIONAL TEXTURE AMPLITUDE
                                 tf===undefined ? 0 : tf, 0, 1 ]; // OPTIONAL TEXTURE FREQUENCY


// SEND CURRENT MATRIX VALUE TO GPU, THEN DOWNLOAD AND DRAW THE SHAPE AS A TRIANGLE STRIP.

let drawShape = shape => {
   let m = matrix.getValue();
   setUniform('Matrix4fv', 'uMatF', false, m);
   setUniform('Matrix4fv', 'uMatI', false, invert(m));
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape), gl.STATIC_DRAW);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, shape.length / stride);
}


// INVERT A 4x4 MATRIX.

function invert(src) {
  let dst = [], det = 0, cofactor = (c, r) => {
     let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
     return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                 - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                 + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
  }
  for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}

let hermiteBasis = new Matrix();
hermiteBasis.setValue([2,-3,0,1, -2,3,0,0, 1,-2,1,0, 1,-1,0,0]);

let bezierBasis = new Matrix();
bezierBasis.setValue([-1,3,-3,1, 3,-6,3,0, -3,3,0,0, 1,0,0,0]);

let evalBezier = (keys, t) => {
   t = Math.max(0, Math.min(t, .9999));
   let n = Math.floor(keys.length / 3); // FIND NUMBER OF KEYS
   let i = Math.floor(n * t) * 3;       // FIND INDEX OF FIRST KEY IN SEGMENT
   let f = n * t % 1;                   // FIND FRACTION WITHIN SEGMENT
   let C = bezierBasis.transform([ keys[i],keys[i+1],keys[i+2],keys[i+3] ]);

   // return f*f*f*C[0] + f*f*C[1] + f*C[2] + C[3];  // LESS EFFICIENT

   return f * (f * (f * C[0] + C[1]) + C[2]) + C[3]; // MORE EFFICIENT
}


// SAMPLE A 3D BEZIER PATH. COMPUTE CROSS VECTOR AT EACH SAMPLE.

let sampleBezierPath = (X,Y,Z,n) => {
   let P = [];
   for (let i = 0 ; i <= n ; i++)
     P.push([evalBezier(X, i/n),
             evalBezier(Y, i/n),
             evalBezier(Z, i/n)]);

   // FIND A START VECTOR TO HELP COMPUTE FIRST U VECTOR

   let U, V, W = V3.normalize(V3.subtract(P[1], P[0]));
   let x = Math.abs(W[0]),
       y = Math.abs(W[1]),
       z = Math.abs(W[2]);
   U = x < Math.min(y, z) ? [1,0,0] :
       y < Math.min(x, z) ? [0,1,0] : [0,0,1];

   // CONTINUALLY MODIFY U AS PATH TURNS

   for (let i = 0 ; i < n ; i++) {
      W = V3.normalize(V3.subtract(P[i+1], P[i]));
      V = V3.normalize(V3.cross(W, U));
      U = V3.normalize(V3.cross(V, W));
      P[i].push(U[0], U[1], U[2]);      // APPEND U TO POSITION
   }
   P[n].push(U[0], U[1], U[2]);         // APPEND U TO LAST POSITION

   return P;
}


// EXTRUDE A PROFILE ALONG A PATH TO CREATE A SHAPE IMAGE.

let extrudeToShapeImage = (profile, path) => {

   let m = profile.length;    // NUMBER OF ROWS.
   let n = path.length;       // NUMBER OF COLUMNS.

   let si = [];
   for (let j = 0 ; j < n ; j++) {
      let p  = path[j],
          p1 = path[j == n-1 ? j-1 : j+1];

      // EXTRACT POSITION P AND CROSS VECTOR U.

      let P  = [p[0], p[1], p[2]];
      let U  = [p[3], p[4], p[5]];

      // COMPUTE V PERPENDICULAR TO BOTH PATH and U.

      let W  = V3.normalize(j == n-1 ? V3.subtract(p, p1)
                                     : V3.subtract(p1, p));
      let V  = V3.normalize(V3.cross(W, U));

      // PLACE THE INDIVIDUAL VERTICES.

      si.push([]);
      for (let i = 0 ; i < m ; i++) {
         let x = profile[i][0],
             y = profile[i][1];
         si[j].push([ P[0] + x * U[0] + y * V[0],
                      P[1] + x * U[1] + y * V[1],
                      P[2] + x * U[2] + y * V[2] ]);
      }
   }
   return si;
}


// CONVERT A SHAPE IMAGE TO A TRIANGLE MESH.

let shapeImageToTriangleMesh = si => {
   let n = si.length;         // NUMBER OF ROWS
   let m = si[0].length;      // NUMBER OF COLUMNS
   let mesh = [];

   // EACH VERTEX MUST ALSO HAVE A NORMAL AND (u,v).

   let addVertex = (i, j) => {
      let P = si[j][i];

      // USE DIFFERENCES BETWEEN NEIGHBORING POSITIONS
      // TO COMPUTE THE SURFACE NORMAL N

      let i0 = i > 0   ? i-1 : V3.equal(si[j][i], si[j][m-1]) ? m-2 : 0;
      let i1 = i < m-1 ? i+1 : V3.equal(si[j][i], si[j][  0]) ?   1 : m-1;
      let j0 = j > 0   ? j-1 : V3.equal(si[j][i], si[n-1][i]) ? n-2 : 0;
      let j1 = j < n-1 ? j+1 : V3.equal(si[j][i], si[  0][i]) ?   1 : n-1;

      let N = V3.normalize(V3.cross(V3.subtract(si[j][i1], si[j][i0]),
                                    V3.subtract(si[j1][i], si[j0][i])));

      mesh.push(P[0],P[1],P[2], N[0],N[1],N[2], i/(m-1),j/(n-1));
   }

   // BUILD AND RETURN A SINGLE TRIANGLE STRIP.

   for (let j = 0 ; j < n-1 ; j++) {
      for (let i = 0 ; i < m ; i++) {
         addVertex(i, j  );
         addVertex(i, j+1);
      }
      addVertex(m-1, j+1);
      addVertex(  0, j+1);
   }

   return mesh;
}


// CONVENIENCE FUNCTION TO EXTRUDE A PROFILE ALONG A PATH,
// AND RETURN A TRIANGLE MESH AS THE RESULT.

let extrude = (profile, path) =>
    shapeImageToTriangleMesh(extrudeToShapeImage(profile, path));


// USE BEZIER SPINES TO CREATE A SURFACE OF REVOLUTION.

let uvToLathe = (u,v,keys) => {
  let theta =2 * Math.PI * u, r, z;
  if (! Array.isArray(keys[0])) {
     //r = evalBezier(keys, v);
     r = evalCRSpline(keys, v);
     z = 2 * v - 1;
  }
  else {
     r = evalBezier(keys[0], v);
     z = evalBezier(keys[1], v);
  }
  return [ r * Math.cos(theta), r * Math.sin(theta), z ];
}


//////////////////////////////////////////////////////
//
// 4x4 MATRIX OBJECT, TO HANDLE ALL MATRIX OPERATIONS.
//
//////////////////////////////////////////////////////


function Matrix() {
   this.identity = function() {
      value = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
      return this;
   }
   this.translate = function(x, y, z) {
      if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
      let m = [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];  // (1) CREATE TRANSLATION MATRIX.
      value = multiply(value, m);                    // (2) MULTIPLY TO CHANGE OBJECT value.
      return this;
   }
   this.rotateX = function(theta) {
      let c = Math.cos(theta), s = Math.sin(theta);
      let m = [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; // (1) CREATE ROTATEX MATRIX.
      value = multiply(value, m);                    // (2) MULTIPLY TO CHANGE OBJECT value.
      return this;
   }
   this.rotateY = function(theta) {
      let c = Math.cos(theta), s = Math.sin(theta);
      let m = [s,0,c,0, 0,1,0,0, c,0,-s,0, 0,0,0,1]; // (1) CREATE ROTATEY MATRIX.
      value = multiply(value, m);                    // (2) MULTIPLY TO CHANGE OBJECT value.
      return this;
   }
   this.rotateZ = function(theta) {
      let c = Math.cos(theta), s = Math.sin(theta);
      let m = [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; // (1) CREATE ROTATEZ MATRIX.
      value = multiply(value, m);                    // (2) MULTIPLY TO CHANGE OBJECT value.
      return this;
   }
   this.scale = function(x,y,z) {
      if (y === undefined) y = z = x;                // SINGLE ARG FOR UNIFORM SCALING.
      let m = [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];  // (1) CREATE SCALE MATRIX.
      value = multiply(value, m);                    // (2) MULTIPLY TO CHANGE OBJECT value.
      return this;
   }

   // MULTIPLY BY ANOTHER MATRIX OBJECT.

   this.multiply = function(matrix) {
      value = multiply(value, matrix.getValue());
      return this;
   }

   // GET AND SET THE CURRENT value.

   this.getValue = function() {
      return value;
   }

   this.setValue = function(v) {
      for (let i = 0 ; i < 16 ; i++)
         value[i] = v[i];
      return this;
   }

   // TRANSFORM A VECTOR.

   this.transform = function(v) {
      let m = value, x = v[0], y = v[1], z = v[2], w = v[3] === undefined ? 1 : v[3];

      let X = m[0] * x + m[4] * y + m[ 8] * z + m[12] * w,
          Y = m[1] * x + m[5] * y + m[ 9] * z + m[13] * w,
          Z = m[2] * x + m[6] * y + m[10] * z + m[14] * w,
          W = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
      return v[3] === undefined ? [X, Y, Z]  : [X, Y, Z, W];
   }

   // INTERNAL STUFF: CURRENT value AND multiply() FUNCTION.

   let value = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; // INTERNAL VALUE IS 16 NUMBERS.

   let multiply = function(a, b) {
      let c = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
      for (let i = 0 ; i < 4 ; i++)
      for (let j = 0 ; j < 4 ; j++)
      for (let k = 0 ; k < 4 ; k++)
         c[j + 4*i] += a[j + 4*k] * b[k + 4*i];
      return c;
   }
}


//////////////////////////////////////
//
// HIERARCHICAL 3D RENDERABLE OBJECTS.
//
//////////////////////////////////////


function Object(shape, phong) {
   this.matrix    = new Matrix();
   this.shape     = shape;
   this.phong     = phong;
   this.children  = [];
   this.child     = n       => this.children[n];
   this.identity  = ()      => this.matrix.identity();
   this.translate = (x,y,z) => this.matrix.translate(x,y,z);
   this.rotateX   = theta   => this.matrix.rotateX(theta);
   this.rotateY   = theta   => this.matrix.rotateY(theta);
   this.rotateZ   = theta   => this.matrix.rotateZ(theta);
   this.scale     = (x,y,z) => this.matrix.scale(x,y,z);
   this.add = (shape, phong) => {
      if (! phong)
         phong = this.phong;
      let child = new Object(shape, phong);
      this.children.push(child);
      return child;
   }
   this.draw = isChild => {
      if (! isChild)
         matrix.identity();
      matrix.multiply(this.matrix);
      if (this.phong)
         setUniform('Matrix4fv', 'uM', false, this.phong);
      if (this.shape)
         drawShape(this.shape);
      let parentValue = matrix.getValue();
      for (let n = 0 ; n < this.children.length ; n++) {
         matrix.setValue(parentValue);
         this.children[n].draw(true);
      }
   }
}


// CREATE A CATMULL ROM BASIS MATRIX

let crBasis = new Matrix();
crBasis.setValue([ -1/2,1,-1/2,0,   3/2,-5/2,0,1,   -3/2,2,1/2,0,   1/2,-1/2,0,0 ]);

let evalCRSpline = (keys, t) => {
   t = Math.max(1/1000, Math.min(1-1/1000, t));

   let n = keys.length - 1,
       i = Math.floor(n * t),
       f = n * t % 1;

   let P0 = keys[i > 0 ? i-1 : V3.equal(keys[0], keys[n]) ? n-1 : 0];
       P1 = keys[i];
       P2 = keys[i+1];
       P3 = keys[i+1 < n ? i+2 : V3.equal(keys[0], keys[n]) ? 1 : n];

   let p = [];
   for (let k = 0 ; k < 3 ; k++) {
      let C = crBasis.transform([ P0[k], P1[k], P2[k], P3[k] ]);
      p.push( f*f*f*C[0] + f*f*C[1] + f*C[2] + C[3] );
   }
   return p;
}
























