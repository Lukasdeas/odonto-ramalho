import { useEffect, useRef } from 'react';

interface WebGLBackgroundProps {
  className?: string;
}

export function WebGLBackground({ className = '' }: WebGLBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const mouseHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    const webgl = gl as WebGLRenderingContext;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = parent.clientWidth + 'px';
        canvas.style.height = parent.clientHeight + 'px';
        webgl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    resizeHandlerRef.current = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      vec3 wineColor = vec3(0.447, 0.184, 0.216);
      vec3 roseColor = vec3(0.753, 0.502, 0.506);
      vec3 darkWine = vec3(0.231, 0.106, 0.122);

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 5; i++) {
          value += amplitude * smoothNoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 3.0;
        
        float t = u_time * 0.15;
        
        float n1 = fbm(p + vec2(t * 0.5, t * 0.3));
        float n2 = fbm(p * 1.5 + vec2(-t * 0.3, t * 0.4) + n1 * 0.5);
        float n3 = fbm(p * 0.5 + vec2(t * 0.2, -t * 0.2) + n2 * 0.3);
        
        float flow = n1 * 0.4 + n2 * 0.4 + n3 * 0.2;
        
        vec3 color1 = mix(darkWine, wineColor, flow);
        vec3 color2 = mix(wineColor, roseColor, n2);
        
        vec3 finalColor = mix(color1, color2, n3 * 0.7);
        
        float gradient = uv.y * 0.4 + 0.3;
        finalColor = mix(darkWine, finalColor, gradient);
        
        float sparkle = smoothNoise(p * 20.0 + t * 2.0);
        sparkle = pow(sparkle, 15.0) * 0.3;
        finalColor += vec3(sparkle) * roseColor;
        
        float vignette = 1.0 - length((uv - 0.5) * 1.2);
        vignette = smoothstep(0.0, 0.7, vignette);
        finalColor *= vignette * 0.8 + 0.4;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function createShader(type: number, source: string): WebGLShader | null {
      const shader = webgl.createShader(type);
      if (!shader) return null;
      webgl.shaderSource(shader, source);
      webgl.compileShader(shader);
      if (!webgl.getShaderParameter(shader, webgl.COMPILE_STATUS)) {
        console.error('Shader compile error:', webgl.getShaderInfoLog(shader));
        webgl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(webgl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(webgl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    const program = webgl.createProgram();
    if (!program) return;
    
    webgl.attachShader(program, vertexShader);
    webgl.attachShader(program, fragmentShader);
    webgl.linkProgram(program);
    
    if (!webgl.getProgramParameter(program, webgl.LINK_STATUS)) {
      console.error('Program link error:', webgl.getProgramInfoLog(program));
      return;
    }

    webgl.useProgram(program);

    const positionBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);
    webgl.bufferData(webgl.ARRAY_BUFFER, positions, webgl.STATIC_DRAW);

    const positionLocation = webgl.getAttribLocation(program, 'a_position');
    webgl.enableVertexAttribArray(positionLocation);
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);

    const timeLocation = webgl.getUniformLocation(program, 'u_time');
    const resolutionLocation = webgl.getUniformLocation(program, 'u_resolution');
    const mouseLocation = webgl.getUniformLocation(program, 'u_mouse');

    let mouseX = 0.5;
    let mouseY = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = 1.0 - e.clientY / window.innerHeight;
    };

    mouseHandlerRef.current = handleMouseMove;
    window.addEventListener('mousemove', handleMouseMove);

    const startTime = Date.now();
    let isRunning = true;

    function render() {
      if (!isRunning || !canvas) return;
      
      const time = (Date.now() - startTime) / 1000;
      
      webgl.uniform1f(timeLocation, time);
      webgl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      webgl.uniform2f(mouseLocation, mouseX, mouseY);
      
      webgl.drawArrays(webgl.TRIANGLES, 0, 6);
      
      animationRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      isRunning = false;
      
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      
      if (mouseHandlerRef.current) {
        window.removeEventListener('mousemove', mouseHandlerRef.current);
        mouseHandlerRef.current = null;
      }
      
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      webgl.useProgram(null);
      
      if (positionBuffer) {
        webgl.deleteBuffer(positionBuffer);
      }
      
      if (program) {
        if (vertexShader) {
          webgl.detachShader(program, vertexShader);
        }
        if (fragmentShader) {
          webgl.detachShader(program, fragmentShader);
        }
        webgl.deleteProgram(program);
      }
      
      if (vertexShader) {
        webgl.deleteShader(vertexShader);
      }
      if (fragmentShader) {
        webgl.deleteShader(fragmentShader);
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
}

export function FloatingParticles({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    resizeHandlerRef.current = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      pulse: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let isRunning = true;

    function animate() {
      if (!isRunning || !ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.pulse += particle.pulseSpeed;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        const pulseOpacity = particle.opacity * (0.5 + 0.5 * Math.sin(particle.pulse));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 128, 129, ${pulseOpacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, `rgba(192, 128, 129, ${pulseOpacity * 0.3})`);
        gradient.addColorStop(1, 'rgba(192, 128, 129, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      isRunning = false;
      
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
}
