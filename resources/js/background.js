let canvas = null;
let gl = null;
let uniformTime = null;
let uniformMouse = null;
const vertices = [-1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
const indices = [0, 2, 3, 0, 1, 2];

window.addEventListener("DOMContentLoaded", () => {
    canvas = document.createElement("canvas");
    canvas.classList.add("bgcanv");
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;
    document.body.appendChild(canvas);
    console.log("appended")

    gl = canvas.getContext('webgl');

    // Create a new buffer object
    const vertex_buffer = gl.createBuffer();
    const index_buffer = gl.createBuffer();

    // Bind an empty array buffer to it
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);

    // Pass the vertices data to the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Unbind the buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    /* Step3: Create and compile Shader programs */
    // Vertex shader source code
    const vertCode = `
        attribute vec2 coordinates;
        void main(void) {
        gl_Position = vec4(coordinates,0.0, 1.0);
        }
    `
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    //Fragment shader source code
    const fragCode = `
        precision mediump float;
        
        uniform vec2 iResolution;
        uniform vec2 iMouse;
        uniform vec3 colour;
        uniform float iTime;

        const vec2 ratio = vec2(1.73, 1.);
        const vec2 hratio = ratio * .5;
        const vec2 hex = normalize(ratio);

        float hexDist(vec2 p) {
        p = abs(p);

        float c = dot(p, hex);
        return max(c, p.y);
        }

        vec3 hexCoords(vec2 p) {
        vec2 a = mod(p, ratio) - hratio;
        vec2 b = mod(p - hratio, ratio) - hratio;
        vec3 col = vec3(0);
        
        vec2 gv = dot(a,a) < dot(b,b) ? a : b;
        float hd = hexDist(gv);
        vec2 hid = p-gv;
        return vec3(hd, hid.x, hid.y);
        }

        void main(void) {
        vec2 uv = (gl_FragCoord.xy - .5 * iResolution) / iResolution.y;
        vec2 muv = (iMouse - .5 * iResolution) / iResolution.y;
        
        const float scale = 8.;
        vec3 c = hexCoords(uv * scale);
        vec3 mc = hexCoords(muv * scale);

        vec2 mth = c.yz - mc.yz;
        float distSq = dot(mth,mth);

        float l = .3 + .1 * sin(distSq*0.1 - iTime*1.2);
        float brightness = smoothstep(0.49, 0.5, c.x) * l;
        vec3 col = colour * max(0.05,brightness);

        gl_FragColor = vec4(col, 1.);
        }
    `
            
    // Create fragment shader object
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    //check frag shader for compilation errors
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(fragShader));
        gl.deleteShader(fragShader);
    }

    // Create a shader program object to store combined shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    const uniformResolution = gl.getUniformLocation(shaderProgram, "iResolution");
    gl.uniform2f(uniformResolution, window.innerWidth, document.documentElement.scrollHeight);

    uniformTime = gl.getUniformLocation(shaderProgram, "iTime");
    gl.uniform1f(uniformTime, 0);

    uniformMouse = gl.getUniformLocation(shaderProgram, "iMouse");
    gl.uniform2f(uniformMouse, 0.0, 0.0);

    const uniformHSL = gl.getUniformLocation(shaderProgram, "colour");
    const style = getComputedStyle(document.documentElement);
    const hue = style.getPropertyValue("--accent-hue");
    const sat = parseInt(style.getPropertyValue("--accent-sat"));
    const [r,g,b] = hslToRGB(hue/360., sat/100., 0.5);
    gl.uniform3f(uniformHSL, r, g, b);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    //Get the attribute location
    const attribCoord = gl.getAttribLocation(shaderProgram, "coordinates");
    gl.vertexAttribPointer(attribCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribCoord);

    gl.clearColor(0.5, 0.5, 0.5, 0.9);

    update(0);

    document.onmousemove = event => {
        gl.uniform2f(uniformMouse, 
        event.clientX, 
        document.documentElement.scrollHeight - event.clientY
        );
    }
    
    window.onresize = () => {
        canvas.width = window.innerWidth;
        canvas.height = document.documentElement.scrollHeight;
        gl.uniform2f(uniformResolution, canvas.width, canvas.height);
    }
});

// TODO: touch support (events: touchstart, touchmove)

function update() {
    const t = performance.now() / 1000.;
    gl.uniform1f(uniformTime, t);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    window.requestAnimationFrame(update);
}

function hueToRGB(m1, m2, h) {
    if (h < 0.) {
        h++;
    }
    else if (h > 1.) {
        h--;
    }

    let result = m1;

    if (h * 6. < 1.) {
        result = m1 + (m2 - m1) * h * 6.;
    }
    else if (h * 2. < 1.) {
        result = m2;
    }
    else if (h * 3. < 2.) {
        result = m1 + (m2 - m1) * (2./3.- h) * 6.;
    }

    return result;
}

function hslToRGB(h, s, l) {
    let m1, m2;
    
    if (l <= 0.5) {
        m2 = l * (s + 1.);
    }
    else {
        m2 = l + s - l * s;
    }

    m1 = l * 2. - m2;

    const r = hueToRGB(m1, m2, h + 1./3.);
    const g = hueToRGB(m1, m2, h        );
    const b = hueToRGB(m1, m2, h - 1./3.);

    return [r,g,b];
}