// Query the canvas and WebGL context
const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
}

// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

// Fragment shader program
const fsSource = `
    varying lowp vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
    }
`;

// Function to initialize shaders
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Function to load a shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Initialize a shader program; this is where all the lighting
// for the vertices and so forth is established.
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

// Collect all the info needed to use the shader program.
// Look up which attributes our shader program is using
// for aVertexPosition, aVertexColor and also
// look up uniform locations.
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
};

// Here's where we call the routine that builds all the
// objects we'll be drawing.
const buffers = initBuffers(gl);

// Draw the scene
function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result
    mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);

// Set the drawing position to the "identity" point, which is
// the center of the scene.
const modelViewMatrix = mat4.create();

// Now move the drawing position a bit to where we want to
// start drawing the square.

// Update modelViewMatrix based on slider values
const radius = parseFloat(document.getElementById("radiusSlider").value);
const theta = parseFloat(document.getElementById("thetaSlider").value) * Math.PI / 180;
const phi = parseFloat(document.getElementById("phiSlider").value) * Math.PI / 180;

const eye = [
radius * Math.sin(theta) * Math.cos(phi),
radius * Math.sin(theta) * Math.sin(phi),
radius * Math.cos(theta)
];
const center = [0, 0, 0];
const up = [0, 1, 0];

mat4.lookAt(modelViewMatrix, eye, center, up);

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
{
const numComponents = 3;  // pull out 3 values per iteration
const type = gl.FLOAT;    // the data in the buffer is 32bit floats
const normalize = false;  // don't normalize
const stride = 0;         // how many bytes to get from one set of values to the next
                     // 0 = use type and numComponents above
const offset = 0;         // how many bytes inside the buffer to start from
gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
gl.vertexAttribPointer(
programInfo.attribLocations.vertexPosition,
numComponents,
type,
normalize,
stride,
offset);
gl.enableVertexAttribArray(
programInfo.attribLocations.vertexPosition);
}

// Tell WebGL how to pull out the colors from the color buffer
// into the vertexColor attribute.
{
const numComponents = 4;  // pull out 4 values per iteration
const type = gl.FLOAT;    // the data in the buffer is 32bit floats
const normalize = false;  // don't normalize
const stride = 0;         // how many bytes to get from one set of values to the next
                     // 0 = use type and numComponents above
const offset = 0;         // how many bytes inside the buffer to start from
gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
gl.vertexAttribPointer(
programInfo.attribLocations.vertexColor,
numComponents,
type,
normalize,
stride,
offset);
gl.enableVertexAttribArray(
programInfo.attribLocations.vertexColor);
}

// Tell WebGL to use our program when drawing
gl.useProgram(programInfo.program);

// Set the shader uniforms
gl.uniformMatrix4fv(
programInfo.uniformLocations.projectionMatrix,
false,
projectionMatrix);
gl.uniformMatrix4fv(
programInfo.uniformLocations.modelViewMatrix,
false,
modelViewMatrix);

{
const offset = 0;
const vertexCount = 36; // 6 faces * 2 triangles/face * 3 vertices/triangle
gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
}

requestAnimationFrame(render);
}

// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
function initBuffers(gl) {

// Create a buffer for the square's positions.
const positionBuffer = gl.createBuffer();

// Select the positionBuffer as the one to apply buffer
// operations to from here out.
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// Now create an array of positions for the cube.
const positions = [
// Front face
-1.0, -1.0,  1.0,
1.0, -1.0,  1.0,
1.0,  1.0,  1.0,
-1.0,  1.0,  1.0,

// Back face
-1.0, -1.0, -1.0,
-1.0,  1.0, -1.0,
1.0,  1.0, -1.0,
1.0, -1.0, -1.0,

// Top face
-1.0,  1.0, -1.0,
-1.0,  1.0,  1.0,
1.0,  1.0,  1.0,
1.0,  1.0, -1.0,

// Bottom face
-1.0, -1.0, -1.0,
1.0, -1.0, -1.0,
1.0, -1.0,  1.0,
-1.0, -1.0,  1.0,

// Right face
1.0, -1.0, -1.0,
1.0,  1.0, -1.0,
1.0,  1.0,  1.0,
1.0, -1.0,  1.0,

// Left face
-1.0, -1.0, -1.0,
-1.0, -1.0,  1.0,
-1.0,  1.0,  1.0,
-1.0,  1.0, -1.0,
];

// Now pass the list of positions into WebGL to build the
// shape. We do this by creating a Float32Array from the
// JavaScript array, then use it to fill the current buffer.
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// Set up the colors for the faces. We'll use solid colors
// for each face.
const faceColors = [
 [1.0,  1.0,  1.0,  1.0],    // Front face: white
 [1.0,  0.0,  0.0,  1.0],    // Back face: red
 [0.0,  1.0,  0.0,  1.0],    // Top face: green
 [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
 [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
 [1.0,  0.0,  1.0,  1.0],    // Left face: purple
];

// Convert the array of colors into a table for all the vertices.
var colors = [];

for (var j = 0; j < faceColors.length; ++j) {
 const c = faceColors[j];

 // Repeat each color four times for the four vertices of the face
 colors = colors.concat(c, c, c, c);
}

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

// Build the element array buffer; this specifies the indices
// into the vertex arrays for each face's vertices.
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// This array defines each face as two triangles, using the
// indices into the vertex array to specify each triangle's
// position.
const indices = [
 0,  1,  2,      0,  2,  3,    // front
 4,  5,  6,      4,  6,  7,    // back
 8,  9,  10,     8,  10, 11,   // top
 12, 13, 14,     12, 14, 15,   // bottom
 16, 17, 18,     16, 18, 19,   // right
 20, 21, 22,     20, 22, 23,   // left
];

// Now send the element array to GL
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

return {
 position: positionBuffer,
 color: colorBuffer,
 indices: indexBuffer,
};
}

// Event listeners for the sliders
document.getElementById("radiusSlider").oninput = function() {
render();
};
document.getElementById("thetaSlider").oninput = function() {
render();
};
document.getElementById("phiSlider").oninput = function() {
render();
};

render(); // Call render to draw the scene
