/**
 * Système de particules pour animations canvas
 */

export class Particle {
  constructor(x, y, color, size, velocityX, velocityY, gravity = 0.1) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.gravity = gravity;
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.005;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
  }

  update() {
    this.velocityY += this.gravity;
    this.x += this.velocityX;
    this.y += this.velocityY;
    this.opacity -= this.decay;
    this.rotation += this.rotationSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }

  isDead() {
    return this.opacity <= 0 || this.y > window.innerHeight + 100;
  }
}

/**
 * Crée explosion de confettis
 */
export function createConfetti(x, y, count = 50) {
  const particles = [];
  const colors = ['#ff0055', '#ffaa00', '#00ff88', '#0088ff', '#ff00ff', '#ffff00'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = Math.random() * 5 + 3;
    const velocityX = Math.cos(angle) * velocity;
    const velocityY = Math.sin(angle) * velocity - Math.random() * 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;

    particles.push(new Particle(x, y, color, size, velocityX, velocityY, 0.15));
  }

  return particles;
}

/**
 * Crée particules de mort (sombres, descendantes)
 */
export function createDeathParticles(x, y, count = 30) {
  const particles = [];
  const colors = ['#1a1a1a', '#333333', '#4a0e0e', '#660000'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = Math.random() * 3 + 1;
    const velocityX = Math.cos(angle) * velocity;
    const velocityY = Math.sin(angle) * velocity + Math.random() * 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 6 + 3;

    particles.push(new Particle(x, y, color, size, velocityX, velocityY, 0.2));
  }

  return particles;
}

/**
 * Crée explosion de vote (rouge éclatant)
 */
export function createVoteExplosion(x, y, count = 40) {
  const particles = [];
  const colors = ['#ff0055', '#ff3366', '#cc0044', '#ff6699'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = Math.random() * 6 + 4;
    const velocityX = Math.cos(angle) * velocity;
    const velocityY = Math.sin(angle) * velocity;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;

    particles.push(new Particle(x, y, color, size, velocityX, velocityY, 0.12));
  }

  return particles;
}

/**
 * Hook React pour gérer le canvas de particules
 */
export function useParticleSystem(canvasRef) {
  const particlesRef = { current: [] };
  const animationFrameRef = { current: null };

  const addParticles = (newParticles) => {
    particlesRef.current.push(...newParticles);
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.update();
      particle.draw(ctx);
      return !particle.isDead();
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!animationFrameRef.current) {
      animate();
    }
  };

  const stopAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const triggerConfetti = (x, y, count) => {
    addParticles(createConfetti(x, y, count));
    startAnimation();
  };

  const triggerDeath = (x, y, count) => {
    addParticles(createDeathParticles(x, y, count));
    startAnimation();
  };

  const triggerVote = (x, y, count) => {
    addParticles(createVoteExplosion(x, y, count));
    startAnimation();
  };

  return {
    triggerConfetti,
    triggerDeath,
    triggerVote,
    stopAnimation,
  };
}
