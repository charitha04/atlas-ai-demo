import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * FlowFieldBackground - A neural network-style animated particle background
 * 
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.color='#1A9375'] - Color of the particles (default: primary green)
 * @param {number} [props.trailOpacity=0.08] - Opacity of the trails (0.0-1.0). Lower = longer trails
 * @param {number} [props.particleCount=400] - Number of particles
 * @param {number} [props.speed=0.8] - Speed multiplier
 * @param {string} [props.backgroundColor='#f4f4f4'] - Background color for trail fade
 * @param {React.ReactNode} [props.children] - Child elements to render on top
 */
export default function FlowFieldBackground({
  className,
  color = "#1A9375", // Primary green from tailwind config
  trailOpacity = 0.08,
  particleCount = 400,
  speed = 0.8,
  backgroundColor = "#f4f4f4", // surface-page color
  children,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- CONFIGURATION ---
    let width = container.clientWidth;
    let height = container.clientHeight;
    let particles = [];
    let animationFrameId;
    let mouse = { x: -1000, y: -1000 }; // Start off-screen

    // --- PARTICLE CLASS ---
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        // Random lifespan to create natural recycling
        this.life = Math.random() * 200 + 100;
      }

      update() {
        // 1. Flow Field Math (Simplex-ish noise)
        // We calculate an angle based on position to create the "flow"
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

        // 2. Add force from flow field
        this.vx += Math.cos(angle) * 0.2 * speed;
        this.vy += Math.sin(angle) * 0.2 * speed;

        // 3. Mouse Repulsion/Attraction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          // Push away
          this.vx -= dx * force * 0.05;
          this.vy -= dy * force * 0.05;
        }

        // 4. Apply Velocity & Friction
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95; // Friction to stop infinite acceleration
        this.vy *= 0.95;

        // 5. Aging
        this.age++;
        if (this.age > this.life) {
          this.reset();
        }

        // 6. Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 200 + 100;
      }

      draw(context) {
        context.fillStyle = color;
        // Fade in and out based on age
        const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2;
        context.globalAlpha = alpha * 0.04; // Very light, subtle effect
        context.fillRect(this.x, this.y, 1.5, 1.5); // Tiny dots are faster than arcs
      }
    }

    // --- HELPER: Convert hex to RGB ---
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 244, g: 244, b: 244 }; // Default to surface-page
    };

    const bgRgb = hexToRgb(backgroundColor);

    // --- INITIALIZATION ---
    const init = () => {
      // Handle High-DPI screens (Retina)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }

      // Fill initial background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    };

    // --- ANIMATION LOOP ---
    const animate = () => {
      // "Fade" effect: Instead of clearing the canvas, we draw a semi-transparent rect
      // This creates the "Trails" look.
      ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // --- EVENT LISTENERS ---
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    // Start
    init();
    animate();

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, trailOpacity, particleCount, speed, backgroundColor]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ backgroundColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

// Named export for convenience
export { FlowFieldBackground };
